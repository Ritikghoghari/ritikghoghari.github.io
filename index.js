const express = require("express");
const mongoose = require("./db/db_connection");
const Contact = require("./model/contact_model");
const fs = require("fs");
const path = require("path");

const app = express();

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Fixed typo

app.get("/homepage", function (req, res) {
  const directoryPath = path.join(__dirname, "files");

  if (!fs.existsSync(directoryPath)) {
    console.warn(
      `Warning: Directory '${directoryPath}' does not exist. Creating it...`
    );
    fs.mkdirSync(directoryPath, { recursive: true }); // Create directory if it doesn't exist
  }

  fs.readdir(directoryPath, function (err, files) {
    if (err) {
      console.error("Error reading files:", err);
      return res.status(500).send("Error reading files");
    }
    res.render("index", { files });
  });
});

app.post("/contact-us", async (req, res) => {
  try {
    console.log("Form data received:", req.body);

    // Validate required fields
    if (!req.body.name || !req.body.email || !req.body.message) {
      return res
        .status(400)
        .json({ status: "error", message: "All fields are required" });
    }

    const formData = new Contact(req.body);
    await formData.save();

    res.status(200).json({
      status: "success",
      message: "Your data has been successfully submitted.",
    });
  } catch (error) {
    console.error("Error saving contact form:", error.message);
    res
      .status(500)
      .json({ status: "error", message: "Error submitting contact form" });
  }
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
