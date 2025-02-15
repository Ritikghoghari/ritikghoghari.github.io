const express = require("express");
const mongoose = require("./db/db_connection");
const Contact = require("./model/contact_model");
const fs = require("fs");
const path = require("path");
const app = express();

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(express.urlencoded({ extends: true }));

app.get("/homepage", function (req, res) {
  fs.readdir(`./files`, function (err, files) {
    if (err) {
      console.error("Error reading files:", err);
      return res.status(500).send("Error reading files");
    }
    res.render("index", { files: files });
  });
});

app.post("/contact-us", async (req, res) => {
  try {
    console.log("Form data received:", req.body); // Log the form data
    const formData = new Contact(req.body);
    // console.log(formData);
    await formData.save();
    res.status(200).json({
      status: "success",
      message: "Your data has been successfully submitted.",
    });
  } catch (error) {
    console.error("Error saving contact form:", error.message); // Log the error message
    console.error(error.stack); // Log the error stack trace
    res.status(400).send("Error submitting contact form");
  }
});

app.listen(3000);
