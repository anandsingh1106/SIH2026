/** Standard success envelope: { success: true, data } */
export function sendSuccess(res, data, status = 200) {
  return res.status(status).json({ success: true, data });
}

/** Paginated envelope: { success: true, data: { items, pagination } } */
export function sendPaginated(res, items, { page, limit, total }) {
  return res.json({
    success: true,
    data: {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: limit > 0 ? Math.ceil(total / limit) : 0,
      },
    },
  });
}

/** Standard error envelope: { success: false, error: { code, message, details } } */
export function sendError(res, { status = 500, code = 'INTERNAL_ERROR', message, details }) {
  const error = { code, message };
  if (details !== undefined) error.details = details;
  return res.status(status).json({ success: false, error });
}
