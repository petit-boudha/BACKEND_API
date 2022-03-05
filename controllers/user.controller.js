const Joi = require("joi");
require("dotenv").config();
const { v4: uuid } = require("uuid");
const { customAlphabet: generate } = require("nanoid");

const { generateJwt } = require("../config/Jwt.config");
const { sendEmail } = require("../config/nodemail.config");
const User = require("../models/user.model");

//Validation du schéma utilisateur
const userSchema = Joi.object().keys({
  name: Joi.string().required(),
  email: Joi.string().email({ minDomainSegments: 2 }),
  password: Joi.string().required().min(4),
  confirmPassword: Joi.string().valid(Joi.ref("password")).required(),
  parrainage: Joi.string(),
});

//Configuration du Code de Parrainage
const CaractereComposantLeCode =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const LongueurCodeParrainage = 10;
const CodeDeParrainage = generate(CaractereComposantLeCode, LongueurCodeParrainage);

//Configuration de l'Inscription
exports.Signup = async (req, res) => {
  try {
    const result = userSchema.validate(req.body);
    if (result.error) {
      console.log(result.error.message);
      return res.json({
        error: true,
        status: 400,
        message: result.error.message,
      });
    }
    //Voyons si l'email existe déjà
    const user = await User.findOne({
      email: result.value.email,
    });
    if (user) {
      return res.json({
        error: true,
        message: "Oups! Cet email est déjà utilisé",
      });
    }

    const hash = await User.hashPassword(result.value.password);
    //Un Utilisateur, un id Unique
    const id = uuid(); 
    result.value.userId = id;
    delete result.value.confirmPassword;
    result.value.password = hash;

    //Le code expire au bout de 30minutes
    let expiry = Date.now() + 60 * 1000 * 30;
    let code = Math.floor(100000 + Math.random() * 900000);
    const sendCode = await sendEmail(result.value.email, code, result.value.name);

    if (sendCode.error) {
      return res.status(500).json({
        error: true,
        message: "Oups! Impossible d'envoyer l'email de vérification.",
      });
    }
    result.value.emailToken = code;
    result.value.emailTokenExpires = new Date(expiry);

    //Configution des parrainages
    if (result.value.hasOwnProperty("parrainage")) {
      let parrainage = await User.findOne({
        CodeDeParrainage: result.value.parrainage,
      });
      if (!parrainage) {
        return res.status(400).send({
          error: true,
          message: "Oups! ce code de parrainage est invalide.",
        });
      }
    }
    result.value.CodeDeParrainage = CodeDeParrainage();
    const newUser = new User(result.value);
    await newUser.save();

    return res.status(200).json({
      success: true,
      message: "L'utilisateur a été enregistré avec succès ! Merci de consulter votre email pour valider votre compte",
      CodeDeParrainage: result.value.CodeDeParrainage,
    });
  } catch (error) {
    console.error("Erreur d'inscription", error);
    return res.status(500).json({
      error: true,
      message: "Oups! impossible de s'inscrire",
    });
  }
};

//Configuration de l'Activation de compte
exports.Activate = async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.json({
        error: true,
        status: 400,
        message: "Demande invalide",
      });
    }
    const user = await User.findOne({
      email: email,
      emailToken: code,
      emailTokenExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        error: true,
        message: "Données invalides",
      });
    } else {
      if (user.active)
        return res.send({
          error: true,
          message: "Votre compte est  déjà activé",
          status: 400,
        });

      user.emailToken = "";
      user.emailTokenExpires = null;
      user.active = true;

      await user.save();

      return res.status(200).json({
        success: true,
        message: "Votre compte est désormais activé.",
      });
    }
  } catch (error) {
    console.error("erreur d'activation du compte", error);
    return res.status(500).json({
      error: true,
      message: error.message,
    });
  }
};

//Configuration de la Connexion
exports.Login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({
        error: true,
        message: "L'accés n'est pas autorisé à cet utilisateur.",
      });
    }
    //Voyons si cet email existe déjà sur la BD
    const user = await User.findOne({ email: email });
    if (!user) {
      return res.status(404).json({
        error: true,
        message: "Compte introuvable !",
      });
    }

    // Si le compte n'est pas activé
    if (!user.active) {
      return res.status(400).json({
        error: true,
        message: "Veullez consulter votre email afin d'activer votre compte !",
      });
    }

    //Vérification mot de passe
    const isValid = await User.comparePasswords(password, user.password);
    if (!isValid) {
      return res.status(400).json({
        error: true,
        message: "Oups ! Vos Identifiants sont invalides !",
      });
    }
    //Génération su token d'accés
    const { error, token } = await generateJwt(user.email, user.userId);
    if (error) {
      return res.status(500).json({
        error: true,
        message: "Il n'est pas actuellement possible de créer le token d'accés.",
      });
    }
    user.accessToken = token;
    await user.save();
    //Réussie
    return res.send({
      success: true,
      message: "L'utilisateur s'est connecté avec succès",
      accessToken: token,
    });
  } catch (err) {
    console.error("Erreur d'identification", err);
    return res.status(500).json({
      error: true,
      message: "Il est actuellement impossible de se connecter.",
    });
  }
};

//Configuration du mot de passe oublié
exports.ForgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.send({
        status: 400,
        error: true,
        message: "Votre ne peut être traité",
      });
    }
    const user = await User.findOne({
      email: email,
    });
    if (!user) {
      return res.send({
        success: true,
        message:
        "Nous vous enverrons un e-mail pour réinitialiser votre mot de passe "});
    }

    let code = Math.floor(100000 + Math.random() * 900000);
    let response = await sendEmail(user.email, code);
    if (response.error) {
      return res.status(500).json({
        error: true,
        message: "Impossible d'envoyer le message",
      });
    }
    //Le code expire au bout de 30minutes
    let expiry = Date.now() + 60 * 1000 * 30;
    user.resetPasswordToken = code;
    user.resetPasswordExpires = expiry; 
    await user.save();
    return res.send({
      success: true,
      message:
        "Nous vous enverrons un e-mail pour réinitialiser votre mot de passe",
    });
  } catch (error) {
    console.error("Erreur mot de passe oublié", error);
    return res.status(500).json({
      error: true,
      message: error.message,
    });
  }
};

//Configuration de la réinitialisation du mot de passe
exports.ResetPassword = async (req, res) => {
  try {
    const { token, newPassword, confirmPassword } = req.body;
    if (!token || !newPassword || !confirmPassword) {
      return res.status(403).json({
        error: true,
        message:
          "Impossible !Veuillez fournir tous les champs obligatoires",
      });
    }
    const user = await User.findOne({
      resetPasswordToken: req.body.token,
      resetPasswordExpires: { $gt: Date.now() },
    });
    if (!user) {
      return res.send({
        error: true,
        message: " Le token de réinitialisation du mot de passe est soit invalide, soit expiré",
      });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        error: true,
        message: "Les mots de passe ne correspondent pas"
      });
    }
    const hash = await User.hashPassword(req.body.newPassword);
    user.password = hash;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = "";
    await user.save();
    return res.send({
      success: true,
      message: "Le mot de passe a été changé avec succé !",
    });
  } catch (error) {
    console.error("Erreur de réinitialisation de mot de passe", error);
    return res.status(500).json({
      error: true,
      message: error.message,
    });
  }
};

//Configuration de déconnexion
exports.Logout = async (req, res) => {
  try {
    const { id } = req.decoded;

    let user = await User.findOne({ userId: id });

    user.accessToken = "";

    await user.save();

    return res.send({ success: true, message: "Utilisateur déconnecté !" });
  } catch (error) {
    console.error("Erreur sur la déconnexion", error);
    return res.stat(500).json({
      error: true,
      message: error.message,
    });
  }
};

//Configuration des Parrainage
exports.ParrainageDeCompte = async (req, res) => {
  try {
    const { id, CodeDeParrainage } = req.decoded;

    const ParrainageDeCompte = await User.find(
      { parrainage: CodeDeParrainage },
      { email: 1, CodeDeParrainage: 1, _id: 0 }
    );
    return res.send({
      success: true,
      accounts: ParrainageDeCompte,
      total: ParrainageDeCompte.length,
    });
  } catch (error) {
    console.error("Erreur sur le parrainage de comptes", error);
    return res.stat(500).json({
      error: true,
      message: error.message,
    });
  }
};


