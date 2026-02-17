import { calculateGravity, determineVibe } from "../../app/lib/planetMath";

describe("calculateGravity", () => {
  test("returns null if mass or radius missing", () => {
    expect(calculateGravity(null, 2)).toBeNull();
    expect(calculateGravity(2, null)).toBeNull();
    expect(calculateGravity(null, null)).toBeNull();
  });

  test("calculates mass / radius^2 and rounds to 2dp", () => {
    expect(calculateGravity(5, 2)).toBe(1.25);
  });
});

describe("determineVibe", () => {
  test("returns Mysterious when temperature missing", () => {
    expect(determineVibe(null, 1)).toBe("Mysterious");
  });

  test("classifies habitable range around 0C (273.15K)", () => {
    expect(determineVibe(273.15, 1)).toBe("Habitable Paradise");
  });

  test("classifies ice world below -100C", () => {
    expect(determineVibe(153.15, 1)).toBe("Ice World");
  });

  test("classifies gas giant if radius > 6", () => {
    expect(determineVibe(400, 7)).toBe("Gas Giant");
  });

  test("classifies hot jupiter if radius > 6 and tempC > 1000", () => {
    expect(determineVibe(1573.15, 7)).toBe("Hot Jupiter");
  });
});
