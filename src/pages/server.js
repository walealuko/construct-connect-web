import cors from "cors";
const app = require("express")();
app.use(cors({
  origin: "*",
}));
app.use(require("express").json());

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  if (email && password) {
    return res.json({ token: "fake-token", user: { email, name: email.split("@")[0] } });
  }
  res.status(400).json({ message: "Invalid login" });
});

app.post("/api/auth/register", (req, res) => {
  const { name, email, password } = req.body;
  if (name && email && password) {
    return res.json({ token: "fake-token", user: { name, email } });
  }
  res.status(400).json({ message: "Invalid registration" });
});

app.listen(5000, () => console.log("Backend running on port 5000 - server.js:27"));