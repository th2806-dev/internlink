using System.Diagnostics;
using System.Net.Sockets;
using InternLink.Application.DTOs;
using InternLink.Application.Interfaces;
using InternLink.Infrastructure.Email;
using InternLink.Infrastructure.Persistence;
using Microsoft.Extensions.Configuration;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace InternLink.Infrastructure.Services;

public sealed class SystemHealthService : ISystemHealthService
{
    private readonly AppDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly EmailSettings _emailSettings;
    private readonly ILogger<SystemHealthService> _logger;

    public SystemHealthService(
        AppDbContext context,
        IConfiguration configuration,
        IOptions<EmailSettings> emailSettings,
        ILogger<SystemHealthService> logger)
    {
        _context = context;
        _configuration = configuration;
        _emailSettings = emailSettings.Value;
        _logger = logger;
    }

    public async Task<SystemHealthResponse> GetHealthAsync(CancellationToken cancellationToken)
    {
        var probes = await Task.WhenAll(
            ProbeAsync("sql", "SQL Server", true, ProbeSqlAsync, cancellationToken),
            ProbeAsync("redis", "Redis", TryGetRedisEndpoint(out var redisHost, out var redisPort),
                token => ProbeTcpAsync(redisHost, redisPort, token), cancellationToken),
            ProbeAsync("s3", "S3 Storage", TryGetS3Endpoint(out var s3Host, out var s3Port),
                token => ProbeTcpAsync(s3Host, s3Port, token), cancellationToken),
            ProbeAsync("smtp", "SMTP", _emailSettings.Enabled,
                token => ProbeTcpAsync(_emailSettings.SmtpHost, _emailSettings.SmtpPort, token), cancellationToken));

        return new SystemHealthResponse(DateTimeOffset.UtcNow, probes);
    }

    private async Task<SystemHealthProbeResponse> ProbeAsync(
        string name,
        string label,
        bool configured,
        Func<CancellationToken, Task<(string Detail, IReadOnlyDictionary<string, string?> Metrics)>> probe,
        CancellationToken cancellationToken)
    {
        if (!configured)
        {
            return new SystemHealthProbeResponse(
                name,
                label,
                "NotConfigured",
                0,
                $"{label} chưa được cấu hình.",
                new Dictionary<string, string?>());
        }

        var stopwatch = Stopwatch.StartNew();
        try
        {
            var result = await probe(cancellationToken);
            stopwatch.Stop();
            return new SystemHealthProbeResponse(
                name,
                label,
                "Healthy",
                stopwatch.Elapsed.TotalMilliseconds,
                result.Detail,
                result.Metrics);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception exception)
        {
            stopwatch.Stop();
            _logger.LogError(exception, "Infrastructure health probe {ProbeName} failed", name);
            return new SystemHealthProbeResponse(
                name,
                label,
                "Unhealthy",
                stopwatch.Elapsed.TotalMilliseconds,
                "Probe thất bại; xem server logs để biết chi tiết.",
                new Dictionary<string, string?>());
        }
    }

    private async Task<(string Detail, IReadOnlyDictionary<string, string?> Metrics)> ProbeSqlAsync(
        CancellationToken cancellationToken)
    {
        var connected = await _context.Database.CanConnectAsync(cancellationToken);
        if (!connected)
            throw new InvalidOperationException("SQL Server is not reachable.");

        return ("Kết nối cơ sở dữ liệu hoạt động.", new Dictionary<string, string?> { ["connected"] = "true" });
    }

    private static async Task<(string Detail, IReadOnlyDictionary<string, string?> Metrics)> ProbeTcpAsync(
        string host,
        int port,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(host) || port is < 1 or > 65535)
            throw new InvalidOperationException("The configured endpoint is invalid.");

        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        timeout.CancelAfter(TimeSpan.FromSeconds(4));
        using var client = new TcpClient();
        await client.ConnectAsync(host, port, timeout.Token);
        return (
            "TCP endpoint reachable; application authentication was not verified.",
            new Dictionary<string, string?> { ["reachable"] = "true", ["port"] = port.ToString() });
    }

    private bool TryGetRedisEndpoint(out string host, out int port)
    {
        host = _configuration["Redis:Host"] ?? string.Empty;
        port = _configuration.GetValue<int?>("Redis:Port") ?? 6379;
        if (!string.IsNullOrWhiteSpace(host))
            return true;

        var connection = _configuration.GetConnectionString("Redis");
        return TryParseHostPort(connection, out host, out port);
    }

    private bool TryGetS3Endpoint(out string host, out int port)
    {
        host = string.Empty;
        port = 443;
        var endpoint = _configuration["Storage:S3:ServiceUrl"]
            ?? _configuration["Storage:S3:Endpoint"]
            ?? _configuration["S3:Endpoint"];
        if (!Uri.TryCreate(endpoint, UriKind.Absolute, out var uri)
            || uri.Scheme is not ("http" or "https"))
            return false;

        host = uri.DnsSafeHost;
        port = uri.IsDefaultPort ? (uri.Scheme == "https" ? 443 : 80) : uri.Port;
        return true;
    }

    private static bool TryParseHostPort(string? connectionString, out string host, out int port)
    {
        host = string.Empty;
        port = 6379;
        if (string.IsNullOrWhiteSpace(connectionString))
            return false;

        var endpoint = connectionString.Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries)
            .FirstOrDefault();
        if (string.IsNullOrWhiteSpace(endpoint))
            return false;

        var separator = endpoint.LastIndexOf(':');
        if (separator <= 0)
        {
            host = endpoint;
            return true;
        }

        if (!int.TryParse(endpoint[(separator + 1)..], out var parsedPort)
            || parsedPort is < 1 or > 65535)
            return false;
        host = endpoint[..separator];
        port = parsedPort;
        return true;
    }
}
