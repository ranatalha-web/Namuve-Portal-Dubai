module.exports = (req, res) => {
    res.status(200).json({
        message: "API is working!",
        path: req.url,
        query: req.query,
        env_check: process.env.VERCEL ? "Runnning on Vercel" : "Not Vercel"
    });
};
