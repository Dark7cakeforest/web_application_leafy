const jwt = require("jsonwebtoken");

function verifyToken(req, res, next) {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!authHeader) {
        return res.status(401).json({ error: "Token required" });
    }

    if (!token) {
        return res.status(403).json({ error: "Invalid token format" });
    }

    try {
        const decoded = jwt.verify(token, "your_secret");
        req.user = decoded; //ใส่ข้อมูลจาก token เข้า req
        next();
    } catch (err) {
        return res.status(403).json({ error: "Invalid or expired token" });
    }
}

module.exports = verifyToken;