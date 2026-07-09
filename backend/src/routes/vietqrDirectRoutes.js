const express = require("express");
const router = express.Router();
const vietqrDirectController = require("../controllers/vietqrDirectController");

router.post("/api/token_generate", vietqrDirectController.generateToken);

router.post(
    "/bank/api/transaction-sync",
    vietqrDirectController.transactionSync
);

module.exports = router;