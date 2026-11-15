using System.Linq.Expressions;
using InternLink.Domain.Entities;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace InternLink.Infrastructure.Persistence;

internal sealed class BaseEntityIdQueryInterceptor : IQueryExpressionInterceptor
{
    public static BaseEntityIdQueryInterceptor Instance { get; } = new();

    public Expression QueryCompilationStarting(
        Expression queryExpression,
        QueryExpressionEventData eventData)
    {
        return new IdAliasVisitor().Visit(queryExpression)!;
    }

    private sealed class IdAliasVisitor : ExpressionVisitor
    {
        protected override Expression VisitMember(MemberExpression node)
        {
            if (node.Member.Name == nameof(BaseEntity.Id)
                && node.Expression != null
                && typeof(BaseEntity).IsAssignableFrom(node.Expression.Type))
            {
                return Expression.Property(node.Expression, nameof(BaseEntity.PublicId));
            }

            return base.VisitMember(node);
        }
    }
}
