using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.AspNetCore.Mvc;

namespace arcane_synergy_app_backend.Tests;

/// <summary>
/// The controllers return anonymous objects. Serializing the payload and
/// asserting against JSON keeps the tests readable and avoids reflection
/// against compiler-generated types.
/// </summary>
internal static class ApiResultExtensions
{
    public static JsonNode OkJson(this IActionResult result)
    {
        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(ok.Value);

        var node = JsonNode.Parse(JsonSerializer.Serialize(ok.Value));
        Assert.NotNull(node);
        return node!;
    }

    public static T OkValue<T>(this IActionResult result)
    {
        var ok = Assert.IsType<OkObjectResult>(result);
        return Assert.IsAssignableFrom<T>(ok.Value);
    }

    public static int Int(this JsonNode node, string property) =>
        node[property]!.GetValue<int>();

    public static JsonArray Array(this JsonNode node, string property) =>
        node[property]!.AsArray();

    /// <summary>
    /// Flattens a { total, byGroup: [{ group, count }] } payload into a lookup.
    /// A null group (patient outside the known groups) is keyed as "null".
    /// </summary>
    public static Dictionary<string, int> GroupCounts(this JsonNode node) =>
        node.Array("byGroup").ToDictionary(
            entry => entry!["group"]?.GetValue<string>() ?? "null",
            entry => entry!.Int("count"));
}
