import mongoose from "mongoose";

const reservationSchema = new mongoose.Schema(
  {
    // Investor who booked the plot
    investorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Company responsible for the project
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    // Project containing the plot
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },

    // Reserved plot
plotId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "Plot",
  required: true,
},

    // Price snapshot at booking time
    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },

    // Reservation lifecycle
    status: {
      type: String,
      enum: [
        "PENDING",
        "CONFIRMED",
        "CANCELLED",
        "EXPIRED",
      ],
      default: "PENDING",
      required: true,
    },

    // Reservation expiry deadline
    expiresAt: {
      type: Date,
      required: true,
    },

    // Cancellation information
    cancelledAt: {
      type: Date,
      default: null,
    },

    // Confirmation information
    confirmedAt: {
      type: Date,
      default: null,
    },

    // Company staff member who confirmed the reservation
confirmedBy: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "User",
  default: null,
},
  },
  {
    timestamps: true,
  }
);

// ==========================================
// PREVENT MULTIPLE ACTIVE RESERVATIONS
// ==========================================
// ONE ACTIVE RESERVATION PER PLOT
reservationSchema.index(
  { plotId: 1 },
  {
    name: "unique_active_plot_reservation",
    unique: true,
    partialFilterExpression: {
      status: {
        $in: ["PENDING", "CONFIRMED"],
      },
    },
  }
);

// ==========================================
// INVESTOR RESERVATION HISTORY
// ==========================================

reservationSchema.index({
  investorId: 1,
  createdAt: -1,
});

// ==========================================
// EXPIRATION LOOKUP
// ==========================================

reservationSchema.index({
  status: 1,
  expiresAt: 1,
});

const Reservation = mongoose.model(
  "Reservation",
  reservationSchema
);

export default Reservation;