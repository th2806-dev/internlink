using System.Data;
using InternLink.Domain.Entities;

namespace InternLink.Application.Interfaces;

/// <summary>
/// Unit of Work pattern interface for orchestrating database operations across multiple repositories
/// with unified transaction management.
/// </summary>
public interface IUnitOfWork : IDisposable, IAsyncDisposable
{
    IRepository<T> Repository<T>() where T : BaseEntity;

    IRepository<User> Users { get; }
    IRepository<Student> Students { get; }
    IRepository<Lecturer> Lecturers { get; }
    IRepository<Semester> Semesters { get; }
    IRepository<Internship> Internships { get; }
    IRepository<Company> Companies { get; }
    IRepository<WeeklyReport> WeeklyReports { get; }
    IRepository<Submission> Submissions { get; }
    IRepository<Feedback> Feedbacks { get; }
    IRepository<Evaluation> Evaluations { get; }
    IRepository<Document> Documents { get; }
    IRepository<Notification> Notifications { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
    Task ExecuteTransactionAsync(
        Func<Task> action,
        IsolationLevel isolationLevel = IsolationLevel.ReadCommitted,
        CancellationToken cancellationToken = default);
    Task<TResult> ExecuteTransactionAsync<TResult>(
        Func<Task<TResult>> action,
        IsolationLevel isolationLevel = IsolationLevel.ReadCommitted,
        CancellationToken cancellationToken = default);
    Task BeginTransactionAsync(CancellationToken cancellationToken = default);
    Task CommitTransactionAsync(CancellationToken cancellationToken = default);
    Task RollbackTransactionAsync(CancellationToken cancellationToken = default);
}
