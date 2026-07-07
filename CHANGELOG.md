# Changelog

## v0.5.1
- Fixed trip style selector so it materially changes recommendations.
- Added urgency scoring.
- Hungry Soon now favors earlier acceptable stops.
- Food Adventure now tolerates more waiting for standout restaurants.
- Added style-specific explanation text.


## v0.5
- Replaced fictional restaurants with a curated real test corridor.
- Added source links, data confidence, verification dates, addresses, and published hours.
- Added operational-risk warnings for sellouts, limited hours, and payment restrictions.
- Clearly separated verified restaurant facts from editorial DetourEats scoring and estimated routing data.


## v0.4
- Added a dedicated Detour Score engine.
- Added richer sample route data with food reputation, uniqueness, confidence, consistency, and destination-worthiness.
- Added score explanation breakdown: Food, Trip Fit, Time, and Scarcity.
- Added guardrails so convenience cannot make mediocre food look elite.
- Improved Best Available logic so the app still makes a decision when the traveler needs to eat.


## v0.3.2
- Replaced weak Best Available copy that implied the driver was still guessing.
- Updated wording to reinforce that DetourEats makes the decision.


## v0.3.1
- Fixed data/engine wiring bug causing the app to show only Keep Driving.
- Explicitly exposed candidate data to the browser window.
- Mapped app fields to existing data fields like seq, estimatedAddedMinutes, famousFor, and arrivalClock.


## v0.3
- Added clearer trip states and recommendation tiers.
- Improved recommendation copy and practical/best-available logic.
- Added safer fallback recommendation behavior.
- Improved skip behavior and details panel language.
- Left the temporary DE logo in place to keep the live site stable.


## v0.2.3
- Replaced the broken detailed illustrated icon with a clean temporary DE mark.
- Kept the green brand theme.
- This is intended as a stable live-site icon while the final logo is refined.


## v0.2.2
- Replaced the too-abstract temporary icon with a more literal road/fork/food icon.
- Enlarged the header icon slightly for better readability.


## v0.2.1
- Simplified the app icon/logo so it reads cleanly at small size.
- Removed the overly detailed landscape-style SVG mark from v0.2.


## v0.2
- Green visual theme.
- New SVG app icon.
- Cleaner public setup flow.
- Debug/simulation controls hidden behind a toggle.
- Updated manifest and cache name.

## v0.1
- Initial prototype with simulated route data and Detour Score recommendation engine.
