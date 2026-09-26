using System.Security.Cryptography;
using System.Text;
using InternLink.Domain.Entities;
using InternLink.Domain.Enums;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace InternLink.Infrastructure.Persistence;

/// <summary>
/// Seeds per-department demo data (plan phase C4): lecturers, students (with login accounts),
/// companies + positions, internships in the department's active semester, and attendance.
/// Idempotent: skipped entirely when demo students already exist.
/// All rows carry DepartmentId so DepartmentAdmin sees only their khoa's data.
/// </summary>
public static class DemoDataSeeder
{
    /// <summary>Deterministic Guid from a name — stable across re-runs.</summary>
    private static Guid GuidFor(string name)
    {
        var hash = MD5.HashData(Encoding.UTF8.GetBytes("internlink-demo:" + name));
        return new Guid(hash);
    }

    public static async Task SeedAsync(AppDbContext context, PasswordHasher<User> hasher)
    {
        if (await context.Students.AnyAsync(s => !s.IsDeleted))
            return; // demo data already seeded (or real data present — never touch it)

        var departments = await context.Departments
            .Where(d => d.IsActive && !d.IsDeleted)
            .OrderBy(d => d.Code)
            .ToListAsync();

        if (departments.Count == 0)
            return;

        var now = DateTime.UtcNow;

        foreach (var dept in departments)
        {
            var activeSemester = await context.Semesters
                .Where(s => !s.IsDeleted && s.DepartmentId == dept.Id && s.Status == SemesterStatus.Active)
                .OrderByDescending(s => s.StartDate)
                .FirstOrDefaultAsync()
                ?? await context.Semesters
                    .Where(s => !s.IsDeleted && s.DepartmentId == dept.Id)
                    .OrderByDescending(s => s.StartDate)
                    .FirstOrDefaultAsync();

            if (activeSemester == null)
                continue; // no semester for this department — skip demo data for it

            // ── Lecturers (2 per department) ────────────────────────────
            var lecturers = new List<Lecturer>();
            var lecturerUserIds = new List<Guid>();
            var lecturerDefs = new (string Code, string Name, string Title)[]
            {
                ("GV" + dept.Code + "01", "TS. Nguyễn Văn An", "Phó Giáo sư"),
                ("GV" + dept.Code + "02", "ThS. Trần Thị Bình", "Giảng viên chính"),
            };

            foreach (var (code, name, title) in lecturerDefs)
            {
                // Login account — GV demo đăng nhập bằng username này + Password123!.
                var lecturerUsername = code.ToLowerInvariant();
                var lecturerUser = new User
                {
                    Id = GuidFor("lecturer-user:" + code),
                    Username = lecturerUsername,
                    FullName = name,
                    Email = lecturerUsername + "@internlink.test",
                    Role = Role.Lecturer,
                    IsActive = true,
                    MustChangePassword = false,
                    CreatedAt = now
                };
                lecturerUser.PasswordHash = hasher.HashPassword(lecturerUser, SeedData.DefaultPassword);
                context.Users.Add(lecturerUser);
                lecturerUserIds.Add(lecturerUser.Id);

                var lecturer = new Lecturer
                {
                    Id = GuidFor("lecturer:" + code),
                    UserId = lecturerUser.Id,
                    StaffCode = code,
                    FullName = name,
                    Email = lecturerUsername + "@internlink.test",
                    Phone = "0900" + code[^2..] + dept.Code.Length + "55" + code[^2..],
                    Department = dept.Name,
                    DepartmentId = dept.Id,
                    CreatedAt = now
                };
                lecturers.Add(lecturer);
            }
            context.Lecturers.AddRange(lecturers);

            // ── Students (3 per department, each with a login account) ──
            var students = new List<Student>();
            var studentDefs = new (string Suffix, string Name, string Class, string Major)[]
            {
                ("1", "Nguyễn Hoàng Minh", "C23A.TH1", "Công nghệ Thông tin"),
                ("2", "Lê Thị Kiều Trang", "C23A.TH1", "Công nghệ Thông tin"),
                ("3", "Phạm Quốc Duy", "C23A.TH2", "Khoa học Máy tính"),
            };

            foreach (var (suffix, name, className, major) in studentDefs)
            {
                var studentCode = dept.Code + "SV000" + suffix;
                var username = studentCode.ToLowerInvariant();

                var user = new User
                {
                    Id = GuidFor("student-user:" + username),
                    Username = username,
                    FullName = name,
                    Email = username + "@internlink.test",
                    Role = Role.Student,
                    DepartmentId = dept.Id,
                    IsActive = true,
                    MustChangePassword = false,
                    CreatedAt = now
                };
                user.PasswordHash = hasher.HashPassword(user, SeedData.DefaultPassword);
                context.Users.Add(user);

                students.Add(new Student
                {
                    Id = GuidFor("student:" + studentCode),
                    UserId = user.Id,
                    StudentCode = studentCode,
                    FullName = name,
                    Class = className,
                    Major = major,
                    Email = username + "@internlink.test",
                    Phone = "09120000" + suffix + dept.Code.Length,
                    Department = dept.Name,
                    DepartmentId = dept.Id,
                    DesiredPosition = dept.Code == "CNTT" ? "Backend Developer Intern" : "Business Analyst Intern",
                    Skills = dept.Code == "CNTT" ? "C#, SQL, Git" : "Phân tích, Excel, PowerPoint",
                    CreatedAt = now
                });
            }
            context.Students.AddRange(students);

            // ── Companies (2 per department) + positions ────────────────
            var companies = new List<Company>();
            var companyDefs = dept.Code == "CNTT"
                ? new (string Code, string Name, string Industry, string Person, string Email)[]
                {
                    ("DN-CNTT-01", "Công ty TNHH FPT Software", "Công nghệ thông tin", "Trần Văn Phong", "hr@fpt-software.test"),
                    ("DN-CNTT-02", "Công ty Cổ phần TMA Solutions", "Công nghệ thông tin", "Nguyễn Thị Hồng", "recruit@tma.test"),
                }
                : new (string Code, string Name, string Industry, string Person, string Email)[]
                {
                    ("DN-QTKD-01", "Công ty TNHH Vũng Tàu Shipping", "Logistics", "Lê Văn Sang", "hr@vtshipping.test"),
                    ("DN-QTKD-02", "Công ty Cổ phần Bách Hóa Xanh", "Bán lẻ", "Phạm Thị Mận", "tuyendung@bachhoaxanh.test"),
                };

            foreach (var (code, name, industry, person, email) in companyDefs)
            {
                companies.Add(new Company
                {
                    Id = GuidFor("company:" + code),
                    CompanyCode = code,
                    CompanyName = name,
                    Address = "Quận 7, TP. Hồ Chí Minh",
                    Website = "https://example.test/" + code.ToLowerInvariant(),
                    Industry = industry,
                    ContactPerson = person,
                    ContactEmail = email,
                    ContactPhone = "02838123" + code[^2..] + dept.Code.Length,
                    Capacity = 10,
                    IsActive = true,
                    CreatedAt = now
                });
            }
            context.Companies.AddRange(companies);

            // Company recruitment positions (scoped to the active semester)
            foreach (var company in companies)
            {
                var positions = dept.Code == "CNTT"
                    ? new (string Title, string Major, string Skills)[] { ("Backend Developer Intern", "CNTT", "C#, .NET, SQL"), ("Frontend Developer Intern", "CNTT", "React, TypeScript") }
                    : new (string Title, string Major, string Skills)[] { ("Business Analyst Intern", "QTKD", "Excel, SQL"), ("Marketing Intern", "QTKD", "Content, Facebook Ads") };

                for (int p = 0; p < positions.Length; p++)
                {
                    context.CompanyPositions.Add(new CompanyPosition
                    {
                        Id = GuidFor("position:" + company.CompanyCode + ":" + p),
                        CompanyId = company.Id,
                        SemesterId = activeSemester.Id,
                        Title = positions[p].Title,
                        Description = "Vị trí thực tập " + positions[p].Title + " tại " + company.CompanyName,
                        RequiredMajor = positions[p].Major,
                        RequiredSkills = positions[p].Skills,
                        Location = "TP. Hồ Chí Minh",
                        Slots = 5,
                        IsOpen = true,
                        CreatedAt = now
                    });
                }
            }

            // ── Internships (each student → active semester, one company, one lecturer) ──
            var internships = new List<Internship>();
            for (int i = 0; i < students.Count; i++)
            {
                internships.Add(new Internship
                {
                    Id = GuidFor("internship:" + dept.Code + ":" + i),
                    StudentId = students[i].Id,
                    CompanyId = companies[i % companies.Count].Id,
                    LecturerId = lecturers[i % lecturers.Count].Id,
                    SemesterId = activeSemester.Id,
                    StartDate = activeSemester.StartDate,
                    EndDate = activeSemester.EndDate,
                    Status = InternshipStatus.InProgress,
                    Position = dept.Code == "CNTT" ? "Backend Developer Intern" : "Business Analyst Intern",
                    SupervisorName = "Anh " + (i % 2 == 0 ? "Minh Trí" : "Quang Huy"),
                    Notes = "Dữ liệu demo cho khoa " + dept.Code,
                    CreatedAt = now
                });
            }
            context.Internships.AddRange(internships);

            // ── Cấu hình báo cáo: 6 tuần + tuần cuối kỳ (T7) ────────────
            // Kịch bản chuẩn của trường: T1..T5 mở nộp (deadline tương lai),
            // T6 tắt (dành cho thi/bảo vệ), T7 = Báo cáo cuối kỳ.
            // Deadline đẩy sang tương lai để demo nộp bài live không báo trễ.
            var semStart = activeSemester.StartDate ?? now;
            for (var week = 1; week <= activeSemester.TotalWeeks + 1; week++)
            {
                var isFinalReport = week == activeSemester.TotalWeeks + 1;
                var isClosedWeek = week == activeSemester.TotalWeeks;
                var isOpen = !isClosedWeek;
                // Kỳ demo bắt đầu trong quá khứ → deadline gốc đã qua. Với tuần đang mở,
                // đẩy deadline sang tương lai để demo nộp bài live không bị báo trễ.
                var dueDate = semStart.AddDays(7 * week - 1).Date.AddHours(23).AddMinutes(59);
                if (isOpen && dueDate < now)
                    dueDate = now.AddDays(7);
                context.SemesterReportSchedules.Add(new SemesterReportSchedule
                {
                    Id = GuidFor("schedule:" + activeSemester.Id + ":" + week),
                    SemesterId = activeSemester.Id,
                    WeekNumber = week,
                    Title = isFinalReport ? "Báo cáo cuối kỳ" : $"Báo cáo tuần {week}",
                    StartDate = semStart.AddDays(7 * (week - 1)),
                    DueDate = dueDate,
                    IsSubmissionOpen = isOpen,
                    AllowLateSubmission = true,
                    Description = isFinalReport
                        ? "Báo cáo thực tập tốt nghiệp + bảo vệ trước hội đồng."
                        : isClosedWeek
                            ? "Tuần bảo vệ/thi — không nhận báo cáo tuần."
                            : $"Hạn nộp báo cáo tuần {week}.",
                    CreatedAt = now
                });
            }

            // ── Weekly reports: SV đầu nộp đủ T1..T5, SV khác T1 + T2 ──
            // → SV đầu đủ điều kiện thi; GV demo chấm điểm live cho SV còn lại.
            var weeklyContents = new (string Content, string Comment)[]
            {
                ("Đã làm quen môi trường, nhận dự án và hoàn thành nhiệm vụ tuần {0}.", "Báo cáo rõ ràng, tuân thủ tiến độ. Tiếp tục phát huy."),
                ("Hoàn thành module đầu tiên, hỗ trợ kiểm thử và viết tài liệu kỹ thuật.", "Kết quả tốt, chú ý viết unit test đầy đủ hơn."),
                ("Triển khai tính năng chính, phối hợp với mentor xử lý bug.", "Tiến độ ổn. Cần chú ý deadline của dự án."),
                ("Hoàn thiện tính năng, tối ưu hiệu năng truy vấn CSDL.", "Có cải tiến đáng kể so với tuần trước."),
                ("Viết tài liệu, chuẩn bị báo cáo cuối kỳ và tổng hợp số liệu.", null),
            };
            for (int i = 0; i < internships.Count; i++)
            {
                var internship = internships[i];
                var maxWeek = i == 0 ? 5 : 2; // SV đầu nộp đủ 5 tuần; SV khác nộp T1–T2
                for (int w = 1; w <= maxWeek; w++)
                {
                    var (content, comment) = weeklyContents[w - 1];
                    // Chờ duyệt chỉ khi là báo cáo mới nhất của SV chưa bị chấm (để GV duyệt live).
                    var isAwaitingReview = i != 0 && w == maxWeek;
                    context.WeeklyReports.Add(new WeeklyReport
                    {
                        Id = GuidFor("weekly-report:" + internship.Id + ":" + w),
                        InternshipId = internship.Id,
                        WeekNumber = w,
                        Title = $"Báo cáo tuần {w}",
                        Content = w <= 5 ? string.Format(content, w) : content,
                        Status = isAwaitingReview ? WeeklyReportStatus.Submitted : WeeklyReportStatus.Approved,
                        SubmittedAt = semStart.AddDays(7 * (w - 1) + 2),
                        LecturerComment = isAwaitingReview ? null : comment,
                        CreatedAt = now
                    });
                }
            }

            // SV đầu tiên của khoa đã được chấm xong (demo màn kết quả SV + thống kê GV):
            // đủ T1..T5 + đã nộp BC cuối kỳ (đủ điều kiện dự thi) + rubric tuần + thưởng sản phẩm.
            // GV chấm live trong demo sẽ chọn SV thứ 2 (nộp T1–T2, có 1 báo cáo chờ duyệt).
            var gradedInternship = internships[0];
            context.Submissions.Add(new Submission
            {
                Id = GuidFor("final-report:" + gradedInternship.Id),
                InternshipId = gradedInternship.Id,
                Type = SubmissionType.FinalReport,
                Status = SubmissionStatus.Submitted,
                Version = 1,
                Title = "Báo cáo thực tập tốt nghiệp",
                Description = "Báo cáo cuối kỳ do GV chấm trước demo.",
                SubmittedAt = semStart.AddDays(7 * activeSemester.TotalWeeks),
                CreatedAt = now
            });
            context.Evaluations.Add(new Evaluation
            {
                Id = GuidFor("evaluation:" + gradedInternship.Id),
                InternshipId = gradedInternship.Id,
                EvaluatedById = lecturerUserIds[0],
                TechnicalScore = 9,
                CommunicationScore = 8,
                TeamworkScore = 9,
                InitiativeScore = 8,
                OralExamScore = 9,
                FinalGrade = 9.2m,
                IsFinalized = true,
                HasCreativeProduct = true,
                WeeklyQualityJson = "{\"1\":5,\"2\":4,\"3\":5,\"4\":4,\"5\":5}",
                Comments = "Sinh viên tiến bộ nhanh, thái độ nghiêm túc.",
                Strengths = "Nắm bắt công nghệ mới tốt, chủ động trong công việc.",
                AreasForImprovement = "Cần rèn thêm kỹ năng viết tài liệu.",
                EvaluatedAt = now,
                CreatedAt = now
            });
            gradedInternship.Status = InternshipStatus.Graded;

            // ── Semester roster (SemesterLecturer) ──────────────────────
            foreach (var lecturer in lecturers)
            {
                context.SemesterLecturers.Add(new SemesterLecturer
                {
                    Id = GuidFor("semester-lecturer:" + activeSemester.Id + ":" + lecturer.StaffCode),
                    SemesterId = activeSemester.Id,
                    LecturerId = lecturer.Id,
                    CreatedAt = now
                });
            }

            // ── Attendance: 2 completed sessions + records per student ──
            for (int week = 1; week <= 2; week++)
            {
                var session = new AttendanceSession
                {
                    Id = GuidFor("attendance-session:" + activeSemester.Id + ":" + week),
                    SemesterId = activeSemester.Id,
                    LecturerId = lecturers[0].Id,
                    WeekNumber = week,
                    Title = "Buổi gặp tuần " + week,
                    Description = "Họp định kỳ theo dõi tiến độ thực tập tuần " + week,
                    MeetingDate = (activeSemester.StartDate ?? now).AddDays(7 * week),
                    DurationMinutes = 60,
                    Location = "Phòng " + dept.Code + "-A" + week + "01",
                    Status = AttendanceSessionStatus.Completed,
                    CreatedAt = now
                };
                context.AttendanceSessions.Add(session);

                for (int i = 0; i < students.Count; i++)
                {
                    context.AttendanceRecords.Add(new AttendanceRecord
                    {
                        Id = GuidFor("attendance-record:" + session.Id + ":" + students[i].Id),
                        AttendanceSessionId = session.Id,
                        StudentId = students[i].Id,
                        InternshipId = internships[i].Id,
                        Status = (week + i) % 3 == 0 ? AttendanceStatus.Absent : AttendanceStatus.Present,
                        MarkedAt = session.MeetingDate.AddMinutes(15),
                        MarkedBy = "demo",
                        CreatedAt = now
                    });
                }
            }
        }

        await context.SaveChangesAsync();
    }
}
