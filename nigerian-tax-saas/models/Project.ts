import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    state: { type: String, required: true },
    budget: { type: Number },
    status: {
      type: String,
      enum: ["open", "in-progress", "completed"],
      default: "open"
    },
  },
  { timestamps: true }
);

projectSchema.index({ state: 1 });
projectSchema.index({ userId: 1 });

export default mongoose.models.Project || mongoose.model("Project", projectSchema);
