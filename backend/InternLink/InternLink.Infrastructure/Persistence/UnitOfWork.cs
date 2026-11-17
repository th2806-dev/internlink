using System.Data;
using System.Collections.Concurrent;
using InternLink.Application.Interfaces;
using InternLink.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

namespace InternLink.Infrastructure.Persistence;

/// <summary>
/// Unit of Work implementation orchestrating EF Core DbContext and generic repositories.
/// </summary>
public class UnitOfWork : IUnitOfWork
{
    private readonly AppDbContext _context;
    private readonly ConcurrentDictionary<Type, object> _repositories = new();
    private IDbContextTransaction? _currentTransaction;

    public UnitOfWork(AppDbContext context)
    {
        _context = context;
    }

    public IRepository<T> Repository<T>() where T : BaseEntity
    {
        return (IRepository<T>)_repositories.GetOrAdd(typeof(T), _ => new GenericRepository<T>(_context));
    }

    public IRepository<User> Users => Repository<User>();
    public IRepository<Student> Students => Repository<Student>();
    public IRepository<Lecturer> Lecturers => Repository<Lecturer>();
    public IRepository<Semester> Semesters => Repository<Semester>();
    public IRepository<Internship> Internships => Repository<Internship>();
    public IRepository<Company> Companies => Repository<Company>();
    public IRepository<WeeklyReport> WeeklyReports => Repository<WeeklyReport>();
    public IRepository<Submission> Submissions => Repository<Submission>();
    public IRepository<Feedback> Feedbacks => Repository<Feedback>();
    public IRepository<Evaluation> Evaluations => Repository<Evaluation>();
    public IRepository<Document> Documents => Repository<Document>();
    public IRepository<Notification> Notifications => Repository<Notification>();

    public async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        return await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task ExecuteTransactionAsync(
        Func<Task> action,
        IsolationLevel isolationLevel = IsolationLevel.ReadCommitted,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(action);
        await ExecuteTransactionAsync(async () =>
        {
            await action();
            return true;
        }, isolationLevel, cancellationToken);
    }

    public Task<TResult> ExecuteTransactionAsync<TResult>(
        Func<Task<TResult>> action,
        IsolationLevel isolationLevel = IsolationLevel.ReadCommitted,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(action);
        var strategy = _context.Database.CreateExecutionStrategy();

        return strategy.ExecuteAsync(
            state: action,
            operation: async (context, transactionAction, token) =>
            {
                await using var transaction = await context.Database.BeginTransactionAsync(
                    isolationLevel,
                    token);
                try
                {
                    var result = await transactionAction();
                    await context.SaveChangesAsync(token);
                    await transaction.CommitAsync(token);
                    return result;
                }
                catch
                {
                    await transaction.RollbackAsync(CancellationToken.None);
                    throw;
                }
            },
            verifySucceeded: null,
            cancellationToken: cancellationToken);
    }

    public async Task BeginTransactionAsync(CancellationToken cancellationToken = default)
    {
        if (_currentTransaction != null)
            return;

        _currentTransaction = await _context.Database.BeginTransactionAsync(cancellationToken);
    }

    public async Task CommitTransactionAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            await SaveChangesAsync(cancellationToken);
            if (_currentTransaction != null)
            {
                await _currentTransaction.CommitAsync(cancellationToken);
            }
        }
        catch
        {
            await RollbackTransactionAsync(cancellationToken);
            throw;
        }
        finally
        {
            if (_currentTransaction != null)
            {
                await _currentTransaction.DisposeAsync();
                _currentTransaction = null;
            }
        }
    }

    public async Task RollbackTransactionAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            if (_currentTransaction != null)
            {
                await _currentTransaction.RollbackAsync(cancellationToken);
            }
        }
        finally
        {
            if (_currentTransaction != null)
            {
                await _currentTransaction.DisposeAsync();
                _currentTransaction = null;
            }
        }
    }

    public void Dispose()
    {
        _currentTransaction?.Dispose();
        _context.Dispose();
        GC.SuppressFinalize(this);
    }

    public async ValueTask DisposeAsync()
    {
        if (_currentTransaction != null)
        {
            await _currentTransaction.DisposeAsync();
        }
        await _context.DisposeAsync();
        GC.SuppressFinalize(this);
    }
}
