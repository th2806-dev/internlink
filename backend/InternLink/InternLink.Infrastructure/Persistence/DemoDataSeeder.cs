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
            var lecturerDefs = new (string Code, string Name, string Title)[]
            {
                ("GV" + dept.Code + "01", "TS. Nguyễn Văn An", "Phó Giáo sư"),
                ("GV" + dept.Code + "02", "ThS. Trần Thị Bình", "Giảng viên chính"),
            };

            foreach (var (code, name, title) in lecturerDefs)
            {
                var lecturer = new Lecturer
                {
                    Id = GuidFor("lecturer:" + code),
                    StaffCode = code,
                    FullName = name,
                    Email = code.ToLowerInvariant() + "@internlink.test",
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
                    MustChangePassword = true,
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
