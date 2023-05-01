const mongoose = require("mongoose");

const DAYS = {
  MON: 1,
  TUE: 2,
  WED: 3,
  THU: 4,
  FRI: 5,
  SAT: 6,
  SUN: 7,
}

const classSchema = mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  id: {
    type: String,
    required: true,
  },
  semester: {
    type: String,
    required: true,
  },
  teacher: {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    }
  },
  note: {
    type: String,
  },
  schedules: [
    {
      day: {
        type: String,
        enum: [DAYS.MON, DAYS.TUE, DAYS.WED, DAYS.THU, DAYS.FRI, DAYS.SAT, DAYS.SUN],
      },
      location: {
        name: {
          type: String,
          required: true,
        },
        wifi: {
          type: Object,
          required: true,
        }
      },
      time: {
        start: {
          type: String,
          required: true,
        },
        end: {
          type: String,
          required: true,
        }
      },
      attendanceTime: {
        start: {
          type: String,
          required: true,
        },
        end: {
          type: String,
          required: true,
        }
      }
    }
  ]
}, {
  timestamps: true,
})

const Class = mongoose.model("Class", classSchema);

export { };

module.exports = Class;