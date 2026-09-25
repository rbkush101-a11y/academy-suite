export function getSubjectCourseIds(subject: any): string[] {
  const rawIds =
    Array.isArray(subject?.courseIds) && subject.courseIds.length > 0
      ? subject.courseIds
      : subject?.courseId
        ? [subject.courseId]
        : [];

  return rawIds
    .map((course: any) =>
      String(course?._id ?? course?.id ?? course)
    )
    .filter(Boolean);
}

export function subjectBelongsToCourse(
  subject: any,
  courseId: unknown
): boolean {
  const wanted = String(courseId ?? "");

  return (
    wanted.length > 0 &&
    getSubjectCourseIds(subject).includes(wanted)
  );
}
