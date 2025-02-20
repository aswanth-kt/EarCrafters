const express = require('express');
const router = express.Router();
const adminController = require("../controllers/admin/adminController");
const {adminAuth, userAuth} = require("../middlewares/auth");



router.get("/pageerror", adminController.pageError);

router.get("/login", adminController.loadLogin);

router.post("/login", adminController.login);

router.get("/", adminAuth, adminController.loadDashboard);

router.get("/logout", adminController.adminLogout)








module.exports = router;