// Emit a complete inventory, including skips and infrastructure failures.
export default async function* report(events) {
  for await (const { type, data } of events) {
    if (type === "test:stdout" || type === "test:stderr") yield data.message;
    if (type === "test:plan" && data.nesting === 0) yield "TEST_PLAN " + data.count + "\n";
    if (type !== "test:pass" && type !== "test:fail") continue;
    const error = data.details?.error;
    const cause = error?.cause;
    const outcome = data.skip || data.todo ? "skipped" : !error ? "passed" :
      error.failureType === "testCodeFailure" && cause?.code === "ERR_ASSERTION" ? "failed" : "inconclusive";
    yield "TEST_RESULT " + JSON.stringify({
      name: data.name, outcome, detail: cause?.stack || error?.message,
    }) + "\n";
  }
}
