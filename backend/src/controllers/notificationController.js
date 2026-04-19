const { z } = require("zod");
const asyncHandler = require("../utils/asyncHandler");
const HttpError = require("../utils/httpError");
const Notification = require("../models/Notification");
const { ROLE_KEYS } = require("../config/constants");

const listNotificationsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z
    .enum(["queued", "sent", "failed", "skipped", "delivered", "read"])
    .optional(),
  unreadOnly: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((value) => {
      if (typeof value === "boolean") {
        return value;
      }
      if (typeof value === "string") {
        return value.toLowerCase() === "true";
      }
      return false;
    }),
  scope: z.enum(["mine", "all"]).default("mine"),
});

const canViewAllNotifications = (roles = []) => {
  return roles.some((role) =>
    [
      ROLE_KEYS.ADMIN,
      ROLE_KEYS.RECRUITER,
      ROLE_KEYS.HIRING_MANAGER,
    ].includes(role)
  );
};

const buildVisibilityFilter = (req, scope) => {
  if (scope === "all" && canViewAllNotifications(req.user?.roles)) {
    return {};
  }

  return {
    $or: [{ recipientUserId: req.user.id }, { recipientEmail: req.user.email }],
  };
};

const listNotifications = asyncHandler(async (req, res) => {
  const data = listNotificationsQuerySchema.parse(req.query);
  const baseFilter = buildVisibilityFilter(req, data.scope);

  const filter = {
    ...baseFilter,
  };

  if (data.status) {
    filter.status = data.status;
  }

  if (data.unreadOnly) {
    filter.readAt = null;
  }

  const skip = (data.page - 1) * data.limit;

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(filter)
      .populate("recipientUserId", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(data.limit),
    Notification.countDocuments(filter),
    Notification.countDocuments({
      ...buildVisibilityFilter(req, data.scope),
      readAt: null,
    }),
  ]);

  res.json({
    notifications,
    unreadCount,
    pagination: {
      page: data.page,
      limit: data.limit,
      total,
      pages: Math.ceil(total / data.limit),
    },
  });
});

const markNotificationRead = asyncHandler(async (req, res) => {
  const hasGlobalAccess = canViewAllNotifications(req.user?.roles);

  const notification = await Notification.findOne(
    hasGlobalAccess
      ? { _id: req.params.notificationId }
      : {
          _id: req.params.notificationId,
          ...buildVisibilityFilter(req, "mine"),
        }
  ).populate("recipientUserId", "name email");

  if (!notification) {
    throw new HttpError(404, "Notification not found");
  }

  if (!notification.readAt) {
    notification.readAt = new Date();
    if (notification.channel === "in_app") {
      notification.status = "read";
    }
    await notification.save();
  }

  res.json({ notification });
});

module.exports = {
  listNotifications,
  markNotificationRead,
};
