export function calculateGravity(mass: number | null, radius: number | null): number | null {
    if (mass == null || radius == null) return null;
    const g = mass / Math.pow(radius, 2);
    return parseFloat(g.toFixed(2));
}

export function determineVibe(tempKelvin: number | null, radius: number | null): string {
    if (!tempKelvin) return "Mysterious";

    const tempC = tempKelvin - 273.15;

    if (radius && radius > 6) {
        if (tempC > 1000) return "Hot Jupiter";
        return "Gas Giant";
    }

    if (tempC < -100) return "Ice World";
    if (tempC >= -50 && tempC <= 50) return "Habitable Paradise";
    if (tempC > 50 && tempC < 200) return "Sauna World";
    if (tempC >= 200 && tempC < 1000) return "Molten Rock";
    if (tempC >= 1000) return "Literal Hellscape";

    return "Barren Wasteland";
}