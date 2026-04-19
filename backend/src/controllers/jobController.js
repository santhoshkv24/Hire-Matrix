const { z } = require("zod");
const asyncHandler = require("../utils/asyncHandler");
const HttpError = require("../utils/httpError");
const Job = require("../models/Job");
const Application = require("../models/Application");

const normalizeOptionalId = (value) => {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }
  const normalized = String(value).trim();
  return normalized ? normalized : null;
};

const createJobSchema = z.object({
  title: z.string().min(2),
  department: z.string().min(2),
  location: z.string().optional(),
  employmentType: z.enum(["full_time", "part_time", "contract", "internship"]).optional(),
  description: z.string().optional(),
  requiredSkills: z.array(z.string()).optional(),
  status: z.enum(["draft", "open", "closed", "cancelled"]).optional(),
  assignedRecruiter: z.string().optional(),
  assignedHiringManager: z.string().optional(),
  targetStartDate: z.string().datetime().optional(),
});

const updateJobSchema = createJobSchema.partial();

const updateTeamSchema = z.object({
  assignedRecruiter: z.union([z.string(), z.null()]).optional(),
  assignedHiringManager: z.union([z.string(), z.null()]).optional(),
});

const populateJob = (query) => {
  return query
    .populate("createdBy", "name email")
    .populate("assignedRecruiter", "name email")
    .populate("assignedHiringManager", "name email");
};

const createJob = asyncHandler(async (req, res) => {
  const data = createJobSchema.parse(req.body);

  const jobData = {
    ...data,
    targetStartDate: data.targetStartDate ? new Date(data.targetStartDate) : null,
    createdBy: req.user.id,
  };

  if (data.assignedRecruiter !== undefined) {
    jobData.assignedRecruiter = normalizeOptionalId(data.assignedRecruiter);
  }

  if (data.assignedHiringManager !== undefined) {
    jobData.assignedHiringManager = normalizeOptionalId(data.assignedHiringManager);
  }

  const job = await Job.create(jobData);

  const populated = await populateJob(Job.findById(job._id));

  res.status(201).json({ job: populated });
});

const listJobs = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status) {
    filter.status = req.query.status;
  }
  if (req.query.search) {
    const regex = new RegExp(String(req.query.search).trim(), "i");
    filter.$or = [{ title: regex }, { department: regex }, { location: regex }];
  }

  const jobs = await populateJob(Job.find(filter).sort({ createdAt: -1 }));

  res.json({ jobs });
});

const listPublicJobs = asyncHandler(async (_req, res) => {
  const jobs = await Job.find({ status: "open" })
    .select(
      "title department location employmentType description requiredSkills targetStartDate createdAt"
    )
    .sort({ createdAt: -1 });

  res.json({ jobs });
});

const getPublicJobById = asyncHandler(async (req, res) => {
  const job = await Job.findOne({ _id: req.params.jobId, status: "open" }).select(
    "title department location employmentType description requiredSkills targetStartDate createdAt"
  );

  if (!job) {
    throw new HttpError(404, "Job not found");
  }

  res.json({ job });
});

const getJobById = asyncHandler(async (req, res) => {
  const job = await populateJob(Job.findById(req.params.jobId));

  if (!job) {
    throw new HttpError(404, "Job not found");
  }

  res.json({ job });
});

const updateJob = asyncHandler(async (req, res) => {
  const data = updateJobSchema.parse(req.body);
  const update = {
    ...data,
  };

  if (data.assignedRecruiter !== undefined) {
    update.assignedRecruiter = normalizeOptionalId(data.assignedRecruiter);
  }

  if (data.assignedHiringManager !== undefined) {
    update.assignedHiringManager = normalizeOptionalId(data.assignedHiringManager);
  }

  if (data.targetStartDate) {
    update.targetStartDate = new Date(data.targetStartDate);
  }

  const job = await populateJob(
    Job.findByIdAndUpdate(req.params.jobId, update, {
      new: true,
      runValidators: true,
    })
  );

  if (!job) {
    throw new HttpError(404, "Job not found");
  }

  res.json({ job });
});

const updateHiringTeam = asyncHandler(async (req, res) => {
  const data = updateTeamSchema.parse(req.body);

  const update = {
    updatedAt: new Date(),
  };

  if (data.assignedRecruiter !== undefined) {
    update.assignedRecruiter = normalizeOptionalId(data.assignedRecruiter);
  }

  if (data.assignedHiringManager !== undefined) {
    update.assignedHiringManager = normalizeOptionalId(data.assignedHiringManager);
  }

  const job = await populateJob(
    Job.findByIdAndUpdate(req.params.jobId, update, {
      new: true,
      runValidators: true,
    })
  );

  if (!job) {
    throw new HttpError(404, "Job not found");
  }

  if (update.assignedRecruiter) {
    await Application.updateMany(
      {
        jobId: req.params.jobId,
        isArchived: false,
        assignedRecruiter: null,
      },
      { $set: { assignedRecruiter: update.assignedRecruiter } }
    );
  }

  if (update.assignedHiringManager) {
    await Application.updateMany(
      {
        jobId: req.params.jobId,
        isArchived: false,
        assignedHiringManager: null,
      },
      { $set: { assignedHiringManager: update.assignedHiringManager } }
    );
  }

  res.json({ job });
});

const deleteJob = asyncHandler(async (req, res) => {
  const deleted = await Job.findByIdAndDelete(req.params.jobId);
  if (!deleted) {
    throw new HttpError(404, "Job not found");
  }

  res.status(204).send();
});

module.exports = {
  createJob,
  listJobs,
  listPublicJobs,
  getPublicJobById,
  getJobById,
  updateJob,
  updateHiringTeam,
  deleteJob,
};