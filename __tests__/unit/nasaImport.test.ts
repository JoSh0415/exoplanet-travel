import { fetchAndNormalizePlanets } from "../../app/lib/nasaImport";
import axios from "axios";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("NASA Import Logic", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should parse and normalize a valid CSV response", async () => {
    const csvData = `pl_name,sy_dist,pl_eqt,pl_masse,pl_rade,disc_year
Planet A,10.5,300,1.2,1.1,2020
Planet B,20.0,,2.0,,2022
`;
    mockedAxios.get.mockResolvedValueOnce({ data: csvData });

    const planets = await fetchAndNormalizePlanets();

    expect(planets).toHaveLength(2);
    
    // Planet A
    expect(planets[0].name).toBe("Planet A");
    expect(planets[0].distance).toBe(34.25); // 10.5 * 3.26156
    expect(planets[0].temperature).toBe(300);
    expect(planets[0].discoveryYear).toBe(2020);
    
    // Planet B (missing some fields)
    expect(planets[1].name).toBe("Planet B");
    expect(planets[1].distance).toBe(65.23); // 20.0 * 3.26156
    expect(planets[1].temperature).toBeNull();
    expect(planets[1].gravity).toBeNull();
    expect(planets[1].discoveryYear).toBe(2022);
  });

  it("should skip empty lines and missing required fields", async () => {
    const csvData = `pl_name,sy_dist,pl_eqt,pl_masse,pl_rade,disc_year

Planet C,10.0,,10.0,3.0,2023
,10.0,,,,
Planet D,invalid,,,,2024
`;
    mockedAxios.get.mockResolvedValueOnce({ data: csvData });

    const planets = await fetchAndNormalizePlanets();

    // Planet C should be parsed, but empty name and invalid distance skipped
    expect(planets).toHaveLength(1);
    expect(planets[0].name).toBe("Planet C");
    expect(planets[0].temperature).toBeNull();
  });

  it("should apply the limit if provided", async () => {
    const csvData = `pl_name,sy_dist,pl_eqt,pl_masse,pl_rade,disc_year
Planet E,10.0,300,1.2,1.1,2020
Planet F,20.0,400,2.0,1.5,2021
Planet G,30.0,500,3.0,2.0,2022
`;
    mockedAxios.get.mockResolvedValueOnce({ data: csvData });

    const planets = await fetchAndNormalizePlanets(2);

    expect(planets).toHaveLength(2);
    expect(planets.map(p => p.name)).toEqual(["Planet E", "Planet F"]);
  });
});
