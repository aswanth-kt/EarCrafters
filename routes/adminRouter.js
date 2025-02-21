const express = require('express');
const router = express.Router();
const adminController = require("../controllers/admin/adminController");
const customerController = require("../controllers/admin/customerController");
const {adminAuth, userAuth} = require("../middlewares/auth");



router.get("/pageerror", adminController.pageError);

// Login Management
router.get("/login", adminController.loadLogin);

router.post("/login", adminController.login);

router.get("/", adminAuth, adminController.loadDashboard);

router.get("/logout", adminController.adminLogout)

//Customer Management
router.get("/users", adminAuth, customerController.customerInfo);

router.get("/blockCustomer/:id", adminAuth, customerController. blockCustomer);

router.get("/unblockCustomer", adminAuth, customerController. unblockCustomer);







module.exports = router;