const candidates = [
  {
    "seq": 1,
    "candidateType": "Core Candidate",
    "corridor": "A/B",
    "segment": "I-88 / Oneonta NY",
    "name": "Brooks' House of Bar-B-Q",
    "city": "Oneonta, NY",
    "cuisine": "BBQ / Cornell-style chicken",
    "price": "$$",
    "primaryMeal": "Lunch",
    "secondaryMeals": "Dinner",
    "famousFor": "Barbecue chicken / Cornell chicken",
    "evidenceSummary": "James Beard America's Classics coverage describes chicken from a 38-foot indoor charcoal pit; official site calls it an award-winning BBQ restaurant.",
    "sources": [
      "https://www.jamesbeard.org/stories/2016-americas-classic-brooks-house-of-bbq",
      "https://brooksbbq.com/"
    ],
    "routeFitConfidence": "Medium",
    "estimatedAddedMinutes": 12,
    "breakfastFit": 2,
    "lunchFit": 9,
    "dinnerFit": 9,
    "dessertFit": 2,
    "destinationEvidence": 9,
    "signatureEvidence": 10,
    "uniqueness": 9,
    "chain": false,
    "backtrackRisk": "Low",
    "hours": {
      "monday": [
        "11:00-19:00"
      ],
      "tuesday": [
        "11:00-19:00"
      ],
      "wednesday": [
        "11:00-19:00"
      ],
      "thursday": [
        "11:00-19:00"
      ],
      "friday": [
        "11:00-19:00"
      ],
      "saturday": [
        "11:00-19:00"
      ],
      "sunday": [
        "11:00-19:00"
      ],
      "hoursSource": "prototype_sample_not_verified",
      "hoursConfidence": "Low"
    }
  },
  {
    "seq": 2,
    "candidateType": "Core Candidate",
    "corridor": "A/B",
    "segment": "I-81 / Binghamton NY",
    "name": "Spiedie & Rib Pit",
    "city": "Binghamton, NY",
    "cuisine": "Regional sandwich / BBQ",
    "price": "$",
    "primaryMeal": "Lunch",
    "secondaryMeals": "Dinner",
    "famousFor": "Spiedies",
    "evidenceSummary": "Bon App\u00e9tit describes spiedies as Binghamton's regional sandwich; Spiedie & Rib Pit official site claims a top spot for gourmet spiedies.",
    "sources": [
      "https://www.bonappetit.com/story/spiedies-binghamton-new-york-sandwich",
      "https://www.spiedieandribpit.com/"
    ],
    "routeFitConfidence": "High",
    "estimatedAddedMinutes": 8,
    "breakfastFit": 1,
    "lunchFit": 9,
    "dinnerFit": 9,
    "dessertFit": 2,
    "destinationEvidence": 8,
    "signatureEvidence": 9,
    "uniqueness": 10,
    "chain": false,
    "backtrackRisk": "Low",
    "hours": {
      "monday": [
        "11:00-21:00"
      ],
      "tuesday": [
        "11:00-21:00"
      ],
      "wednesday": [
        "11:00-21:00"
      ],
      "thursday": [
        "11:00-21:00"
      ],
      "friday": [
        "11:00-21:00"
      ],
      "saturday": [
        "11:00-21:00"
      ],
      "sunday": [
        "11:00-21:00"
      ],
      "hoursSource": "prototype_sample_not_verified",
      "hoursConfidence": "Low"
    }
  },
  {
    "seq": 3,
    "candidateType": "Breakfast/Morning",
    "corridor": "A/B",
    "segment": "I-81 / Binghamton NY",
    "name": "Chris' Diner",
    "city": "Binghamton, NY",
    "cuisine": "Diner / breakfast",
    "price": "$",
    "primaryMeal": "Breakfast",
    "secondaryMeals": "Lunch",
    "famousFor": "Pancakes / classic diner breakfast",
    "evidenceSummary": "Tripadvisor's Binghamton breakfast list ranks Chris' Diner highly and mentions pancakes/blueberry pancakes in user snippets.",
    "sources": [
      "https://www.tripadvisor.com/Restaurants-g47320-zfp2-Binghamton_New_York.html"
    ],
    "routeFitConfidence": "Medium",
    "estimatedAddedMinutes": 8,
    "breakfastFit": 9,
    "lunchFit": 6,
    "dinnerFit": 2,
    "dessertFit": 2,
    "destinationEvidence": 6,
    "signatureEvidence": 7,
    "uniqueness": 6,
    "chain": false,
    "backtrackRisk": "Low",
    "hours": {
      "monday": [
        "06:30-14:00"
      ],
      "tuesday": [
        "06:30-14:00"
      ],
      "wednesday": [
        "06:30-14:00"
      ],
      "thursday": [
        "06:30-14:00"
      ],
      "friday": [
        "06:30-14:00"
      ],
      "saturday": [
        "06:30-14:00"
      ],
      "sunday": [
        "07:00-13:00"
      ],
      "hoursSource": "prototype_sample_not_verified",
      "hoursConfidence": "Low"
    }
  },
  {
    "seq": 4,
    "candidateType": "Breakfast/Morning",
    "corridor": "A/B",
    "segment": "I-81 / Frackville PA",
    "name": "Dutch Kitchen",
    "city": "Frackville, PA",
    "cuisine": "Diner / Pennsylvania Dutch",
    "price": "$$",
    "primaryMeal": "Breakfast",
    "secondaryMeals": "Lunch",
    "famousFor": "Shoofly pie / hearty local fare",
    "evidenceSummary": "Roadfood calls Dutch Kitchen a convenient diner off I-81 in Pennsylvania Coal Country serving hearty local fare including shoofly pie; official site lists Route 61 & I-81 Exit 124B.",
    "sources": [
      "https://roadfood.com/restaurants/dutch-kitchen",
      "https://www.dutchkitchen.com/"
    ],
    "routeFitConfidence": "High",
    "estimatedAddedMinutes": 8,
    "breakfastFit": 8,
    "lunchFit": 7,
    "dinnerFit": 5,
    "dessertFit": 5,
    "destinationEvidence": 6,
    "signatureEvidence": 7,
    "uniqueness": 8,
    "chain": false,
    "backtrackRisk": "Low",
    "hours": {
      "monday": [
        "06:30-14:00"
      ],
      "tuesday": [
        "06:30-14:00"
      ],
      "wednesday": [
        "06:30-14:00"
      ],
      "thursday": [
        "06:30-14:00"
      ],
      "friday": [
        "06:30-14:00"
      ],
      "saturday": [
        "06:30-14:00"
      ],
      "sunday": [
        "07:00-13:00"
      ],
      "hoursSource": "prototype_sample_not_verified",
      "hoursConfidence": "Low"
    }
  },
  {
    "seq": 5,
    "candidateType": "Breakfast/Morning",
    "corridor": "A/B",
    "segment": "I-81 / Carlisle PA",
    "name": "Carlisle Diner",
    "city": "Carlisle, PA",
    "cuisine": "Family diner / breakfast",
    "price": "$",
    "primaryMeal": "Breakfast",
    "secondaryMeals": "Lunch/Dinner",
    "famousFor": "Homemade diner breakfast",
    "evidenceSummary": "Official site says family-owned diner with homemade food prepared fresh daily and piping hot breakfast items.",
    "sources": [
      "https://www.carlislediner.com/"
    ],
    "routeFitConfidence": "Medium",
    "estimatedAddedMinutes": 8,
    "breakfastFit": 8,
    "lunchFit": 6,
    "dinnerFit": 4,
    "dessertFit": 2,
    "destinationEvidence": 5,
    "signatureEvidence": 6,
    "uniqueness": 5,
    "chain": false,
    "backtrackRisk": "Low",
    "hours": {
      "monday": [
        "06:30-14:00"
      ],
      "tuesday": [
        "06:30-14:00"
      ],
      "wednesday": [
        "06:30-14:00"
      ],
      "thursday": [
        "06:30-14:00"
      ],
      "friday": [
        "06:30-14:00"
      ],
      "saturday": [
        "06:30-14:00"
      ],
      "sunday": [
        "07:00-13:00"
      ],
      "hoursSource": "prototype_sample_not_verified",
      "hoursConfidence": "Low"
    }
  },
  {
    "seq": 6,
    "candidateType": "Breakfast/Morning",
    "corridor": "A/B",
    "segment": "I-81 / Carlisle PA",
    "name": "Walnut Bottom Diner",
    "city": "Carlisle, PA",
    "cuisine": "Diner / breakfast all day",
    "price": "$",
    "primaryMeal": "Breakfast",
    "secondaryMeals": "Lunch",
    "famousFor": "All-day breakfast / waffles / omelets",
    "evidenceSummary": "Local coverage says Walnut Bottom Diner serves breakfast all day with eggs, omelets, pancakes, French toast, waffles and breakfast sandwiches; Tripadvisor snippet mentions easy off/on for I-81.",
    "sources": [
      "https://www.buickgmccarlisle.com/blogs/3210/places-to-eat-in-carlisle/worth-the-morning-drive-4-breakfast-places-in-carlisle-pa/",
      "https://www.tripadvisor.com/Restaurant_Review-g52311-d5549926-Reviews-Walnut_Bottom_Diner-Carlisle_Pennsylvania.html"
    ],
    "routeFitConfidence": "Medium",
    "estimatedAddedMinutes": 7,
    "breakfastFit": 8,
    "lunchFit": 6,
    "dinnerFit": 3,
    "dessertFit": 2,
    "destinationEvidence": 5,
    "signatureEvidence": 6,
    "uniqueness": 5,
    "chain": false,
    "backtrackRisk": "Low",
    "hours": {
      "monday": [
        "06:30-14:00"
      ],
      "tuesday": [
        "06:30-14:00"
      ],
      "wednesday": [
        "06:30-14:00"
      ],
      "thursday": [
        "06:30-14:00"
      ],
      "friday": [
        "06:30-14:00"
      ],
      "saturday": [
        "06:30-14:00"
      ],
      "sunday": [
        "07:00-13:00"
      ],
      "hoursSource": "prototype_sample_not_verified",
      "hoursConfidence": "Low"
    }
  },
  {
    "seq": 7,
    "candidateType": "Breakfast/Morning",
    "corridor": "A/B",
    "segment": "I-81 / Winchester VA",
    "name": "Papermill Place Restaurant",
    "city": "Winchester, VA",
    "cuisine": "Breakfast diner",
    "price": "$",
    "primaryMeal": "Breakfast",
    "secondaryMeals": "Lunch",
    "famousFor": "All-day breakfast / biscuits and gravy / pancakes",
    "evidenceSummary": "Official site says open every day 7AM-2PM and breakfast served all day; Visit Winchester calls it one of the most crowded breakfast spots in the area.",
    "sources": [
      "https://papermillrestaurant.com/",
      "https://visitwinchesterva.com/breakfast-spots-winchester/"
    ],
    "routeFitConfidence": "High",
    "estimatedAddedMinutes": 8,
    "breakfastFit": 9,
    "lunchFit": 5,
    "dinnerFit": 1,
    "dessertFit": 2,
    "destinationEvidence": 6,
    "signatureEvidence": 7,
    "uniqueness": 6,
    "chain": false,
    "backtrackRisk": "Low",
    "hours": {
      "monday": [
        "06:30-14:00"
      ],
      "tuesday": [
        "06:30-14:00"
      ],
      "wednesday": [
        "06:30-14:00"
      ],
      "thursday": [
        "06:30-14:00"
      ],
      "friday": [
        "06:30-14:00"
      ],
      "saturday": [
        "06:30-14:00"
      ],
      "sunday": [
        "07:00-13:00"
      ],
      "hoursSource": "prototype_sample_not_verified",
      "hoursConfidence": "Low"
    }
  },
  {
    "seq": 8,
    "candidateType": "Breakfast/Morning",
    "corridor": "A/B",
    "segment": "I-81 / Winchester VA",
    "name": "Bonnie Blue Southern Market & Bakery",
    "city": "Winchester, VA",
    "cuisine": "Southern breakfast / bakery / BBQ",
    "price": "$$",
    "primaryMeal": "Breakfast",
    "secondaryMeals": "Brunch/Lunch",
    "famousFor": "Biscuits & gravy / chicken & waffles / pulled pork & eggs",
    "evidenceSummary": "Official menu lists breakfast/brunch items including biscuits and gravy, chicken and waffles, pulled pork & eggs, shrimp & grits, and breakfast served in a restored market/bakery setting.",
    "sources": [
      "https://winchestersbestbbq.com/",
      "https://visitwinchesterva.com/breakfast-spots-winchester/"
    ],
    "routeFitConfidence": "Medium",
    "estimatedAddedMinutes": 12,
    "breakfastFit": 9,
    "lunchFit": 8,
    "dinnerFit": 4,
    "dessertFit": 6,
    "destinationEvidence": 8,
    "signatureEvidence": 9,
    "uniqueness": 9,
    "chain": false,
    "backtrackRisk": "Low",
    "hours": {
      "monday": [
        "06:30-14:00"
      ],
      "tuesday": [
        "06:30-14:00"
      ],
      "wednesday": [
        "06:30-14:00"
      ],
      "thursday": [
        "06:30-14:00"
      ],
      "friday": [
        "06:30-14:00"
      ],
      "saturday": [
        "06:30-14:00"
      ],
      "sunday": [
        "07:00-13:00"
      ],
      "hoursSource": "prototype_sample_not_verified",
      "hoursConfidence": "Low"
    }
  },
  {
    "seq": 9,
    "candidateType": "Breakfast/Morning",
    "corridor": "A/B",
    "segment": "I-81 / Harrisonburg VA",
    "name": "Joe's Diner",
    "city": "Harrisonburg, VA",
    "cuisine": "Diner / truck stop comfort food",
    "price": "$",
    "primaryMeal": "Breakfast",
    "secondaryMeals": "Lunch/Dinner",
    "famousFor": "Country fried steak / comfort diner food",
    "evidenceSummary": "Official site positions Joe's Diner as a one-stop spot for travelers and truck drivers with comfort food and gas pumps.",
    "sources": [
      "https://joesdinerharrisonburg.com/"
    ],
    "routeFitConfidence": "Medium",
    "estimatedAddedMinutes": 8,
    "breakfastFit": 8,
    "lunchFit": 6,
    "dinnerFit": 4,
    "dessertFit": 2,
    "destinationEvidence": 5,
    "signatureEvidence": 6,
    "uniqueness": 5,
    "chain": false,
    "backtrackRisk": "Low",
    "hours": {
      "monday": [
        "06:30-14:00"
      ],
      "tuesday": [
        "06:30-14:00"
      ],
      "wednesday": [
        "06:30-14:00"
      ],
      "thursday": [
        "06:30-14:00"
      ],
      "friday": [
        "06:30-14:00"
      ],
      "saturday": [
        "06:30-14:00"
      ],
      "sunday": [
        "07:00-13:00"
      ],
      "hoursSource": "prototype_sample_not_verified",
      "hoursConfidence": "Low"
    }
  },
  {
    "seq": 10,
    "candidateType": "Breakfast/Morning",
    "corridor": "A/B",
    "segment": "I-81 / Harrisonburg VA",
    "name": "The Galley Diner",
    "city": "Harrisonburg, VA",
    "cuisine": "Diner",
    "price": "$",
    "primaryMeal": "Breakfast",
    "secondaryMeals": "Lunch/Dinner",
    "famousFor": "Classic diner breakfast",
    "evidenceSummary": "Official site lists Harrisonburg location/hours and opens at 7AM; diner format makes it a practical breakfast candidate.",
    "sources": [
      "https://thegalleyharrisonburg.com/"
    ],
    "routeFitConfidence": "Medium",
    "estimatedAddedMinutes": 8,
    "breakfastFit": 8,
    "lunchFit": 6,
    "dinnerFit": 4,
    "dessertFit": 2,
    "destinationEvidence": 5,
    "signatureEvidence": 6,
    "uniqueness": 5,
    "chain": false,
    "backtrackRisk": "Low",
    "hours": {
      "monday": [
        "06:30-14:00"
      ],
      "tuesday": [
        "06:30-14:00"
      ],
      "wednesday": [
        "06:30-14:00"
      ],
      "thursday": [
        "06:30-14:00"
      ],
      "friday": [
        "06:30-14:00"
      ],
      "saturday": [
        "06:30-14:00"
      ],
      "sunday": [
        "07:00-13:00"
      ],
      "hoursSource": "prototype_sample_not_verified",
      "hoursConfidence": "Low"
    }
  },
  {
    "seq": 11,
    "candidateType": "Core Candidate",
    "corridor": "A/B",
    "segment": "I-81 / Middletown VA",
    "name": "Shaffer's BBQ & Market",
    "city": "Middletown, VA",
    "cuisine": "BBQ",
    "price": "$$",
    "primaryMeal": "Lunch",
    "secondaryMeals": "Dinner",
    "famousFor": "Shenandoah Valley barbecue",
    "evidenceSummary": "Official site says Shenandoah Valley barbecue since 1952 and explicitly lists I-81 Exit 302.",
    "sources": [
      "https://shaffersbbq.com/",
      "https://pitmaster.amazingribs.com/forum/bbq-restaurant-roundup/virginia/1379822-suggestions-for-traveling-i-81-through-virginia-meatup"
    ],
    "routeFitConfidence": "High",
    "estimatedAddedMinutes": 6,
    "breakfastFit": 1,
    "lunchFit": 8,
    "dinnerFit": 8,
    "dessertFit": 2,
    "destinationEvidence": 7,
    "signatureEvidence": 8,
    "uniqueness": 7,
    "chain": false,
    "backtrackRisk": "Low",
    "hours": {
      "monday": [
        "11:00-21:00"
      ],
      "tuesday": [
        "11:00-21:00"
      ],
      "wednesday": [
        "11:00-21:00"
      ],
      "thursday": [
        "11:00-21:00"
      ],
      "friday": [
        "11:00-21:00"
      ],
      "saturday": [
        "11:00-21:00"
      ],
      "sunday": [
        "11:00-21:00"
      ],
      "hoursSource": "prototype_sample_not_verified",
      "hoursConfidence": "Low"
    }
  },
  {
    "seq": 12,
    "candidateType": "Core Candidate",
    "corridor": "A/B",
    "segment": "I-81 / Staunton VA",
    "name": "Edelweiss German Restaurant",
    "city": "Staunton, VA",
    "cuisine": "German",
    "price": "$$",
    "primaryMeal": "Lunch",
    "secondaryMeals": "Dinner",
    "famousFor": "Schnitzel / authentic German food",
    "evidenceSummary": "Official site emphasizes authentic German food; Virginia Living calls it a charming log cabin restaurant where nobody leaves hungry.",
    "sources": [
      "https://edelweissvirginia.com/",
      "https://virginialiving.com/food/edelweiss/"
    ],
    "routeFitConfidence": "High",
    "estimatedAddedMinutes": 10,
    "breakfastFit": 1,
    "lunchFit": 8,
    "dinnerFit": 8,
    "dessertFit": 3,
    "destinationEvidence": 7,
    "signatureEvidence": 8,
    "uniqueness": 9,
    "chain": false,
    "backtrackRisk": "Low",
    "hours": {
      "monday": [
        "11:00-21:00"
      ],
      "tuesday": [
        "11:00-21:00"
      ],
      "wednesday": [
        "11:00-21:00"
      ],
      "thursday": [
        "11:00-21:00"
      ],
      "friday": [
        "11:00-21:00"
      ],
      "saturday": [
        "11:00-21:00"
      ],
      "sunday": [
        "11:00-21:00"
      ],
      "hoursSource": "prototype_sample_not_verified",
      "hoursConfidence": "Low"
    }
  },
  {
    "seq": 13,
    "candidateType": "Breakfast/Morning",
    "corridor": "A/B",
    "segment": "I-81 / Roanoke VA",
    "name": "Scratch Biscuit Company",
    "city": "Roanoke, VA",
    "cuisine": "Breakfast / biscuits",
    "price": "$$",
    "primaryMeal": "Breakfast",
    "secondaryMeals": "Lunch",
    "famousFor": "Scratch-made biscuits",
    "evidenceSummary": "Visit Roanoke says Scratch Biscuit Company makes scratch-made biscuits and highlights breakfast sandwich options with house-made jam/eggs/meat.",
    "sources": [
      "https://www.visitroanokeva.com/blog/post/best-breakfast-restaurants-virginia-blue-ridge-mountains/"
    ],
    "routeFitConfidence": "Medium",
    "estimatedAddedMinutes": 15,
    "breakfastFit": 10,
    "lunchFit": 6,
    "dinnerFit": 1,
    "dessertFit": 2,
    "destinationEvidence": 7,
    "signatureEvidence": 9,
    "uniqueness": 7,
    "chain": false,
    "backtrackRisk": "Medium",
    "hours": {
      "monday": [
        "06:30-14:00"
      ],
      "tuesday": [
        "06:30-14:00"
      ],
      "wednesday": [
        "06:30-14:00"
      ],
      "thursday": [
        "06:30-14:00"
      ],
      "friday": [
        "06:30-14:00"
      ],
      "saturday": [
        "06:30-14:00"
      ],
      "sunday": [
        "07:00-13:00"
      ],
      "hoursSource": "prototype_sample_not_verified",
      "hoursConfidence": "Low"
    }
  },
  {
    "seq": 14,
    "candidateType": "Breakfast/Morning",
    "corridor": "A/B",
    "segment": "I-81 / Troutville or Salem VA",
    "name": "Angelle's Diner",
    "city": "Troutville / Salem, VA",
    "cuisine": "Diner / breakfast",
    "price": "$",
    "primaryMeal": "Breakfast",
    "secondaryMeals": "Lunch",
    "famousFor": "Omelets / waffles / hash browns",
    "evidenceSummary": "Visit Roanoke highlights Angelle's Diner for omelets, waffle combinations, and build-your-own hash browns; another regional source notes convenient I-81 locations.",
    "sources": [
      "https://www.visitroanokeva.com/blog/post/best-breakfast-restaurants-virginia-blue-ridge-mountains/",
      "https://www.visitroanokeva.com/blog/post/13-restaurants-for-great-southern-comfort-food-in-virginia-blue-ridge-mountains/"
    ],
    "routeFitConfidence": "High",
    "estimatedAddedMinutes": 6,
    "breakfastFit": 9,
    "lunchFit": 6,
    "dinnerFit": 3,
    "dessertFit": 2,
    "destinationEvidence": 6,
    "signatureEvidence": 7,
    "uniqueness": 6,
    "chain": false,
    "backtrackRisk": "Low",
    "hours": {
      "monday": [
        "06:30-14:00"
      ],
      "tuesday": [
        "06:30-14:00"
      ],
      "wednesday": [
        "06:30-14:00"
      ],
      "thursday": [
        "06:30-14:00"
      ],
      "friday": [
        "06:30-14:00"
      ],
      "saturday": [
        "06:30-14:00"
      ],
      "sunday": [
        "07:00-13:00"
      ],
      "hoursSource": "prototype_sample_not_verified",
      "hoursConfidence": "Low"
    }
  },
  {
    "seq": 15,
    "candidateType": "Breakfast/Morning",
    "corridor": "A/B",
    "segment": "I-81 / Salem VA",
    "name": "Chip & Jo's",
    "city": "Salem, VA",
    "cuisine": "Diner / breakfast",
    "price": "$",
    "primaryMeal": "Breakfast",
    "secondaryMeals": "Lunch",
    "famousFor": "Classic diner breakfasts",
    "evidenceSummary": "Visit Roanoke describes Chip & Jo's as a cherished diner offering delicious breakfasts and lists weekday hours starting at 6AM.",
    "sources": [
      "https://www.visitroanokeva.com/listings/chip-%26-jos/9167/"
    ],
    "routeFitConfidence": "Medium",
    "estimatedAddedMinutes": 10,
    "breakfastFit": 8,
    "lunchFit": 6,
    "dinnerFit": 3,
    "dessertFit": 2,
    "destinationEvidence": 5,
    "signatureEvidence": 6,
    "uniqueness": 5,
    "chain": false,
    "backtrackRisk": "Low",
    "hours": {
      "monday": [
        "06:30-14:00"
      ],
      "tuesday": [
        "06:30-14:00"
      ],
      "wednesday": [
        "06:30-14:00"
      ],
      "thursday": [
        "06:30-14:00"
      ],
      "friday": [
        "06:30-14:00"
      ],
      "saturday": [
        "06:30-14:00"
      ],
      "sunday": [
        "07:00-13:00"
      ],
      "hoursSource": "prototype_sample_not_verified",
      "hoursConfidence": "Low"
    }
  },
  {
    "seq": 16,
    "candidateType": "Core Candidate",
    "corridor": "A/B",
    "segment": "I-81 / Daleville VA",
    "name": "Three Li'l Pigs BBQ",
    "city": "Daleville, VA",
    "cuisine": "BBQ",
    "price": "$$",
    "primaryMeal": "Lunch",
    "secondaryMeals": "Dinner",
    "famousFor": "NC-style barbecue / smoked meats",
    "evidenceSummary": "Visit Roanoke says it is a top destination in Daleville, from I-81 Exit 150 about 1/2 mile away; official site says it smokes its own meat.",
    "sources": [
      "https://www.visitroanokeva.com/listings/three-lil-pigs-bbq/6589/",
      "https://threelilpigsbbq.com/"
    ],
    "routeFitConfidence": "High",
    "estimatedAddedMinutes": 5,
    "breakfastFit": 1,
    "lunchFit": 8,
    "dinnerFit": 8,
    "dessertFit": 2,
    "destinationEvidence": 7,
    "signatureEvidence": 8,
    "uniqueness": 7,
    "chain": false,
    "backtrackRisk": "Low",
    "hours": {
      "monday": [
        "11:00-21:00"
      ],
      "tuesday": [
        "11:00-21:00"
      ],
      "wednesday": [
        "11:00-21:00"
      ],
      "thursday": [
        "11:00-21:00"
      ],
      "friday": [
        "11:00-21:00"
      ],
      "saturday": [
        "11:00-21:00"
      ],
      "sunday": [
        "11:00-21:00"
      ],
      "hoursSource": "prototype_sample_not_verified",
      "hoursConfidence": "Low"
    }
  },
  {
    "seq": 17,
    "candidateType": "Core Candidate",
    "corridor": "A/B",
    "segment": "I-81 / Salem VA",
    "name": "Mac and Bob's",
    "city": "Salem, VA",
    "cuisine": "American pub / calzones",
    "price": "$$",
    "primaryMeal": "Lunch",
    "secondaryMeals": "Dinner",
    "famousFor": "Huge calzones",
    "evidenceSummary": "Official site says famous for huge calzones and a locals' favorite; Visit Roanoke notes it has been a local favorite since 1980.",
    "sources": [
      "https://www.macandbobs.com/",
      "https://www.visitroanokeva.com/listings/mac-and-bobs-restaurant/5645/"
    ],
    "routeFitConfidence": "Medium",
    "estimatedAddedMinutes": 12,
    "breakfastFit": 1,
    "lunchFit": 8,
    "dinnerFit": 8,
    "dessertFit": 2,
    "destinationEvidence": 7,
    "signatureEvidence": 8,
    "uniqueness": 7,
    "chain": false,
    "backtrackRisk": "Medium",
    "hours": {
      "monday": [
        "11:00-21:00"
      ],
      "tuesday": [
        "11:00-21:00"
      ],
      "wednesday": [
        "11:00-21:00"
      ],
      "thursday": [
        "11:00-21:00"
      ],
      "friday": [
        "11:00-21:00"
      ],
      "saturday": [
        "11:00-21:00"
      ],
      "sunday": [
        "11:00-21:00"
      ],
      "hoursSource": "prototype_sample_not_verified",
      "hoursConfidence": "Low"
    }
  },
  {
    "seq": 18,
    "candidateType": "Breakfast/Morning",
    "corridor": "B",
    "segment": "I-77 / Mount Airy NC alternate",
    "name": "Snappy Lunch",
    "city": "Mount Airy, NC",
    "cuisine": "Diner",
    "price": "$",
    "primaryMeal": "Breakfast",
    "secondaryMeals": "Lunch",
    "famousFor": "World Famous Pork Chop Sandwich",
    "evidenceSummary": "Official site says no visit to Mt. Airy is complete without the pork chop sandwich; Our State says fans drive for hours and line up for it.",
    "sources": [
      "https://thesnappylunch.com/",
      "https://www.ourstate.com/snappy-lunch/"
    ],
    "routeFitConfidence": "Medium",
    "estimatedAddedMinutes": 15,
    "breakfastFit": 8,
    "lunchFit": 10,
    "dinnerFit": 2,
    "dessertFit": 2,
    "destinationEvidence": 9,
    "signatureEvidence": 10,
    "uniqueness": 9,
    "chain": false,
    "backtrackRisk": "Low",
    "hours": {
      "monday": [
        "06:30-14:00"
      ],
      "tuesday": [
        "06:30-14:00"
      ],
      "wednesday": [
        "06:30-14:00"
      ],
      "thursday": [
        "06:30-14:00"
      ],
      "friday": [
        "06:30-14:00"
      ],
      "saturday": [
        "06:30-14:00"
      ],
      "sunday": [
        "07:00-13:00"
      ],
      "hoursSource": "prototype_sample_not_verified",
      "hoursConfidence": "Low"
    }
  },
  {
    "seq": 19,
    "candidateType": "Core Candidate",
    "corridor": "B",
    "segment": "I-77/I-74 / Lexington NC alternate",
    "name": "Lexington Barbecue",
    "city": "Lexington, NC",
    "cuisine": "NC BBQ",
    "price": "$$",
    "primaryMeal": "Lunch",
    "secondaryMeals": "Dinner",
    "famousFor": "Western-style Carolina BBQ",
    "evidenceSummary": "Official site says nationally known and serving Western-style Carolina BBQ since 1962; VisitNC identifies Lexington as a historic barbecue destination.",
    "sources": [
      "https://www.lexbbq.com/",
      "https://www.visitnc.com/itinerary/plan-flavorful-lexington-barbecue-tour"
    ],
    "routeFitConfidence": "Low",
    "estimatedAddedMinutes": 28,
    "breakfastFit": 1,
    "lunchFit": 9,
    "dinnerFit": 9,
    "dessertFit": 2,
    "destinationEvidence": 10,
    "signatureEvidence": 10,
    "uniqueness": 9,
    "chain": false,
    "backtrackRisk": "Medium",
    "hours": {
      "monday": [
        "11:00-21:00"
      ],
      "tuesday": [
        "11:00-21:00"
      ],
      "wednesday": [
        "11:00-21:00"
      ],
      "thursday": [
        "11:00-21:00"
      ],
      "friday": [
        "11:00-21:00"
      ],
      "saturday": [
        "11:00-21:00"
      ],
      "sunday": [
        "11:00-21:00"
      ],
      "hoursSource": "prototype_sample_not_verified",
      "hoursConfidence": "Low"
    }
  },
  {
    "seq": 20,
    "candidateType": "Core Candidate",
    "corridor": "A/B",
    "segment": "I-95 / Latta SC",
    "name": "Shuler's Barbecue",
    "city": "Latta, SC",
    "cuisine": "SC BBQ buffet",
    "price": "$$",
    "primaryMeal": "Lunch",
    "secondaryMeals": "Dinner",
    "famousFor": "Buffet BBQ / Southern sides",
    "evidenceSummary": "Destination BBQ says Shuler's sits minutes from I-95 and is considered one of South Carolina's best BBQ restaurants; official site calls it a worth-the-drive deep South dining experience.",
    "sources": [
      "https://destination-bbq.com/stores/shulers-barbecue/",
      "https://shulersbbq.com/"
    ],
    "routeFitConfidence": "High",
    "estimatedAddedMinutes": 8,
    "breakfastFit": 1,
    "lunchFit": 9,
    "dinnerFit": 9,
    "dessertFit": 3,
    "destinationEvidence": 9,
    "signatureEvidence": 8,
    "uniqueness": 8,
    "chain": false,
    "backtrackRisk": "Low",
    "hours": {
      "monday": [
        "11:00-20:00"
      ],
      "tuesday": [
        "11:00-20:00"
      ],
      "wednesday": [
        "11:00-20:00"
      ],
      "thursday": [
        "11:00-20:00"
      ],
      "friday": [
        "11:00-20:00"
      ],
      "saturday": [
        "11:00-20:00"
      ],
      "sunday": [
        "11:00-20:00"
      ],
      "hoursSource": "prototype_sample_not_verified",
      "hoursConfidence": "Low"
    }
  },
  {
    "seq": 21,
    "candidateType": "Core Candidate",
    "corridor": "A/B",
    "segment": "SC near Myrtle / Hemingway",
    "name": "Scott's Bar-B-Que",
    "city": "Hemingway, SC",
    "cuisine": "Whole-hog BBQ",
    "price": "$$",
    "primaryMeal": "Lunch",
    "secondaryMeals": "Dinner",
    "famousFor": "Whole-hog wood-cooked barbecue",
    "evidenceSummary": "Destination BBQ notes Scott's has been featured by NYT/Bourdain and more; Food & Wine calls Scott's a country-road destination with whole hog cooked over embers since the 1970s.",
    "sources": [
      "https://destination-bbq.com/stores/scotts-bar-b-que/",
      "https://www.foodandwine.com/carolina-barbecue-8654444"
    ],
    "routeFitConfidence": "Medium",
    "estimatedAddedMinutes": 35,
    "breakfastFit": 1,
    "lunchFit": 9,
    "dinnerFit": 9,
    "dessertFit": 2,
    "destinationEvidence": 10,
    "signatureEvidence": 10,
    "uniqueness": 10,
    "chain": false,
    "backtrackRisk": "Medium",
    "hours": {
      "monday": [
        "10:00-18:00"
      ],
      "tuesday": [
        "10:00-18:00"
      ],
      "wednesday": [
        "10:00-18:00"
      ],
      "thursday": [
        "10:00-18:00"
      ],
      "friday": [
        "10:00-18:00"
      ],
      "saturday": [
        "10:00-18:00"
      ],
      "sunday": [
        "10:00-18:00"
      ],
      "hoursSource": "prototype_sample_not_verified",
      "hoursConfidence": "Low"
    }
  },
  {
    "seq": 22,
    "candidateType": "Breakfast/Morning",
    "corridor": "A/B",
    "segment": "I-95 / Florence SC",
    "name": "Long Grain Cafe",
    "city": "Florence, SC",
    "cuisine": "Cafe / breakfast",
    "price": "$$",
    "primaryMeal": "Breakfast",
    "secondaryMeals": "Lunch",
    "famousFor": "Chicken and waffles / cafe breakfast",
    "evidenceSummary": "Tripadvisor breakfast list for Florence shows Long Grain Cafe as a high-listed local breakfast option and references chicken and waffles in snippets.",
    "sources": [
      "https://www.tripadvisor.com/Restaurants-g54229-zfp2-Florence_South_Carolina.html"
    ],
    "routeFitConfidence": "Medium",
    "estimatedAddedMinutes": 12,
    "breakfastFit": 8,
    "lunchFit": 6,
    "dinnerFit": 2,
    "dessertFit": 2,
    "destinationEvidence": 5,
    "signatureEvidence": 7,
    "uniqueness": 5,
    "chain": false,
    "backtrackRisk": "Low",
    "hours": {
      "monday": [
        "06:30-14:00"
      ],
      "tuesday": [
        "06:30-14:00"
      ],
      "wednesday": [
        "06:30-14:00"
      ],
      "thursday": [
        "06:30-14:00"
      ],
      "friday": [
        "06:30-14:00"
      ],
      "saturday": [
        "06:30-14:00"
      ],
      "sunday": [
        "07:00-13:00"
      ],
      "hoursSource": "prototype_sample_not_verified",
      "hoursConfidence": "Low"
    }
  },
  {
    "seq": 23,
    "candidateType": "Arrival Candidate",
    "corridor": "Arrival",
    "segment": "Myrtle Beach SC",
    "name": "Bimini's Oyster Bar",
    "city": "Myrtle Beach, SC",
    "cuisine": "Seafood / oyster bar",
    "price": "$$",
    "primaryMeal": "Dinner",
    "secondaryMeals": "Lunch",
    "famousFor": "Oysters / local seafood",
    "evidenceSummary": "Cond\u00e9 Nast Traveler names Bimini's among Myrtle Beach local favorites; official site positions it as a no-frills local oyster bar.",
    "sources": [
      "https://www.cntraveler.com/story/things-to-do-in-myrtle-beach-south-carolina",
      "https://www.biminisoysterbar.com/"
    ],
    "routeFitConfidence": "High",
    "estimatedAddedMinutes": 15,
    "breakfastFit": 1,
    "lunchFit": 7,
    "dinnerFit": 9,
    "dessertFit": 3,
    "destinationEvidence": 7,
    "signatureEvidence": 8,
    "uniqueness": 7,
    "chain": false,
    "backtrackRisk": "Low",
    "hours": {
      "monday": [
        "11:30-22:00"
      ],
      "tuesday": [
        "11:30-22:00"
      ],
      "wednesday": [
        "11:30-22:00"
      ],
      "thursday": [
        "11:30-22:00"
      ],
      "friday": [
        "11:30-22:00"
      ],
      "saturday": [
        "11:30-22:00"
      ],
      "sunday": [
        "11:30-22:00"
      ],
      "hoursSource": "prototype_sample_not_verified",
      "hoursConfidence": "Low"
    }
  },
  {
    "seq": 24,
    "candidateType": "Arrival Candidate",
    "corridor": "Arrival",
    "segment": "Myrtle Beach SC",
    "name": "Hook & Barrel",
    "city": "Myrtle Beach, SC",
    "cuisine": "Seafood",
    "price": "$$$",
    "primaryMeal": "Dinner",
    "secondaryMeals": "Lunch",
    "famousFor": "Sustainable seafood / local produce",
    "evidenceSummary": "Cond\u00e9 Nast Traveler lists Hook & Barrel as a local favorite; official site emphasizes sustainable food and local produce.",
    "sources": [
      "https://www.cntraveler.com/story/things-to-do-in-myrtle-beach-south-carolina",
      "https://hookandbarrelrestaurant.com/"
    ],
    "routeFitConfidence": "High",
    "estimatedAddedMinutes": 15,
    "breakfastFit": 1,
    "lunchFit": 7,
    "dinnerFit": 9,
    "dessertFit": 3,
    "destinationEvidence": 7,
    "signatureEvidence": 8,
    "uniqueness": 7,
    "chain": false,
    "backtrackRisk": "Low",
    "hours": {
      "monday": [
        "11:30-22:00"
      ],
      "tuesday": [
        "11:30-22:00"
      ],
      "wednesday": [
        "11:30-22:00"
      ],
      "thursday": [
        "11:30-22:00"
      ],
      "friday": [
        "11:30-22:00"
      ],
      "saturday": [
        "11:30-22:00"
      ],
      "sunday": [
        "11:30-22:00"
      ],
      "hoursSource": "prototype_sample_not_verified",
      "hoursConfidence": "Low"
    }
  }
];

// Expose prototype candidate data to the app layer.
// This avoids browser scoping issues with top-level `const candidates`.
window.DETOUR_EATS_CANDIDATES = candidates;
