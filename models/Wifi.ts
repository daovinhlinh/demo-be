import { NextFunction } from "express";

const mongoose = require("mongoose");

const wifiSchema = mongoose.Schema(
  {
    ssid: {
      type: Object
    }
  },
  {
    timestamps: true,
  }
);

const Wifi = mongoose.model("Wifi", wifiSchema);
module.exports = Wifi;
export { };
