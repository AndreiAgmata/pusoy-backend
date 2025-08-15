import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import { runFastMonteCarlo } from "./montecarlo.js";

const app = express();

// Enable CORS for all origins (or restrict to your frontend)
app.use(
  cors({
    origin: "http://localhost:3000",
  })
);

app.use(bodyParser.json({ type: "application/json" }));

app.post("/simulate", (req, res) => {
  const { myCards, iterations } = req.body;

  if (!myCards || myCards.length !== 13) {
    return res.status(400).json({ error: "Provide exactly 13 cards" });
  }

  try {
    const result = runFastMonteCarlo(myCards, iterations || 5000);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Simulation failed" });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
