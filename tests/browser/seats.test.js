import assert from "node:assert/strict";
import { after, before, beforeEach, afterEach, test } from "node:test";
import { chromium } from "playwright-core";

const baseURL = process.env.APP_URL || "http://127.0.0.1:4173";
let browser, page;
before(async () => {
  browser = await chromium.launch({ executablePath: process.env.CHROME_BIN });
});
after(async () => { await browser?.close(); });
beforeEach(async () => {
  page = await browser.newPage();
  await page.goto(baseURL);
  await page.getByRole("heading", { name: "Choose your seats" }).waitFor();
});
afterEach(async () => { await page?.close(); });

const seat = id => page.getByRole("button", { name: "Seat " + id, exact: true });
const reserve = () => page.getByRole("button", { name: "Reserve seats" });

async function reserveAndReadResult() {
  await reserve().click();
  const feedback = page.locator('[role="status"], [role="alert"]');
  await feedback.waitFor();
  return feedback.innerText();
}

test("seat selection updates the total and can be cleared", async () => {
  assert.equal(await reserve().isDisabled(), true);
  await seat("A1").click();
  assert.equal(await page.locator(".total strong").innerText(), "$14");
  await seat("A1").click();
  assert.equal(await reserve().isDisabled(), true);
});
test("occupied seats cannot be selected", async () => {
  assert.equal(await seat("A3").isDisabled(), true);
});
test("a standard seat can be reserved once per visit", async () => {
  await seat("A1").click();
  const actual = await page.locator(".total strong").innerText();
  const feedback = await reserveAndReadResult();
  console.log("BASELINE_RESULT " + JSON.stringify({
    scenario: "single_seat", inputs: "Seat A1", expected: "$14", actual, feedback,
  }));
  assert.equal(actual, "$14");
  assert.match(feedback, /Booking confirmed[\s\S]*A1/);
  assert.equal(await seat("A1").isDisabled(), true);
});
test("C4 has a usable ticket type", async () => {
  await seat("C4").click();
  assert.match(await reserveAndReadResult(), /Booking confirmed[\s\S]*C4/);
});
test("D2 is marked taken before checkout", async () => {
  assert.equal(await seat("D2").isDisabled(), true);
});
test("two seats incur one booking fee and can be reserved", async () => {
  await seat("A1").click();
  await seat("A2").click();
  const actual = await page.locator(".total strong").innerText();
  const quote = page.waitForResponse(response =>
    new URL(response.url()).pathname === "/api/quote" && response.request().method() === "POST");
  const [response, feedback] = await Promise.all([quote, reserveAndReadResult()]);
  const { message } = await response.json();
  console.log("BASELINE_RESULT " + JSON.stringify({
    scenario: "two_seat_fee", inputs: "Seats A1 and A2", expected: "$26", actual,
    http_status: response.status(), message, feedback,
  }));
  assert.equal(actual, "$26");
  assert.equal(response.status(), 200);
  assert.match(feedback, /Booking confirmed/);
});
