# The Lantern

A local cinema box office with a selectable seat map, itemized prices, per-visit reservations and deliberately faulty checkout paths. Refreshing the page resets the demo.

From this folder run `docker compose up -d --build buggy-react` and open [the box office](http://127.0.0.1:4173).

| Select, then click Reserve seats | What to look for |
| --- | --- |
| A1 | A $14 booking succeeds and the seat becomes unavailable. |
| C4 alone | The companion ticket type is missing. The booking panel displays the error and expandable stack trace. |
| D2 alone | The map shows an available seat that the box office considers taken. The booking panel shows the conflict. |
| A1 and A2 on a fresh page | The summary charges the fee twice. The box office rejects the $28 total because the correct total is $26. |

After a failure, deselect the affected seats and try A1 to recover. Expand **Stack trace** for debugging. Each checkout error also writes a structured browser event to the app container's log.

For the startup failure run `DEMO_PROFILE=stale docker compose up -d buggy-react`. The process exits before serving a page. Inspect the Docker logs or investigator incidents. Restore the normal profile with `DEMO_PROFILE=normal docker compose up -d buggy-react`.

Run the browser regressions with:

```sh
docker compose --profile tests build browser-tests
docker compose --profile tests run --rm browser-tests
```

The suite checks the intended booking behavior. On the deliberately buggy app three controls pass and three regression checks fail.

The companion [Bug Investigator](https://github.com/aikastor/bug-investigator) watches this app, verifies candidate fixes in isolated containers, and presents the results for review. Clone these two projects into sibling directories named `faulty-app` and `bug-investigator`.
