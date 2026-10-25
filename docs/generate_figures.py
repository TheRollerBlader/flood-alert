"""Build the README figures: hazard chart, storm simulation, terrain, and gauges.

Run from the repo root with the docs virtualenv, or any Python that has
matplotlib, numpy, and pillow:

    python docs/generate_figures.py
"""

from __future__ import annotations

import json
import struct
import urllib.request
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
from matplotlib.colors import LinearSegmentedColormap
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
FIG = ROOT / "docs" / "figures"
MODEL = ROOT / "docs" / "models"

INK = "#142029"
MUTED = "#5c6b73"
BRAND = "#0f5f66"
LINE = "#d5ddd8"
PAPER = "#f7f5f0"
CLEAR = "#1F8A70"
WATCH = "#C8960C"
WARNING = "#E06A12"
SEVERE = "#D92D20"
CRITICAL = "#9F1239"

GAUGES = {
    "08052745": "Doe Branch at US 380",
    "08059590": "Wilson Creek at US 75",
    "08059000": "East Fork Trinity",
}


def elevation(x: np.ndarray, y: np.ndarray) -> np.ndarray:
    """Schematic vented-ford surface, in feet. The road runs along y and dips at y = 0."""
    dip = 2.35 * np.exp(-((y / 28.0) ** 2))
    groove = 0.62 * np.exp(-((x / 7.5) ** 2)) * np.exp(-((y / 16.0) ** 2))
    crown = 0.22 * (x / 24.0) ** 2
    return 3.15 - dip - groove + crown


def style():
    plt.rcParams.update(
        {
            "font.family": "DejaVu Sans",
            "axes.edgecolor": "#8aa0a6",
            "axes.labelcolor": INK,
            "axes.titlecolor": INK,
            "xtick.color": INK,
            "ytick.color": INK,
            "text.color": INK,
            "figure.facecolor": "white",
            "savefig.facecolor": "white",
            "axes.facecolor": "white",
        }
    )


def finish(fig: plt.Figure, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(path, dpi=160, bbox_inches="tight", pad_inches=0.28)
    plt.close(fig)


def hazard_bands() -> None:
    fig, ax = plt.subplots(figsize=(9.4, 3.8))
    rows = [
        ("Critical", "2.0 ft and above", CRITICAL, "Even an SUV or light truck can float and be swept away"),
        ("Severe", "1.0 – 2.0 ft", SEVERE, "A small car can start to float"),
        ("Warning", "0.5 – 1.0 ft", WARNING, "Water reaches a sedan’s lower chassis"),
        ("Watch", "0.1 – 0.5 ft", WATCH, "Water is building. Do not assume the dip is dry"),
        ("Clear", "Under 0.1 ft", CLEAR, "A typical vehicle can cross as usual"),
    ]
    for index, (name, span, color, note) in enumerate(rows):
        y = len(rows) - 1 - index
        ax.barh(y, 1.15, color=color, height=0.62, zorder=2)
        ax.text(0.08, y, name, va="center", ha="left", color="white", fontsize=12, fontweight="bold")
        ax.text(1.35, y, span, va="center", ha="left", color=INK, fontsize=11)
        ax.text(3.15, y, note, va="center", ha="left", color=MUTED, fontsize=10)
    ax.set_xlim(0, 8.6)
    ax.set_ylim(-0.7, len(rows) - 0.3)
    ax.axis("off")
    ax.set_title("Vehicle hazard bands over the lowest point of the crossing", loc="left", fontsize=13, pad=8)
    ax.text(
        0,
        -0.55,
        "Thresholds follow the project dossier. Watch fills the gap between clear water and the 0.5 ft chassis line.",
        color=MUTED,
        fontsize=8,
    )
    finish(fig, FIG / "hazard-bands.png")


def storm_simulation() -> None:
    hours = np.linspace(0, 18, 181)
    rain = 1.35 * np.exp(-0.5 * ((hours - 4.2) / 1.15) ** 2)
    rain_6h = np.array([rain[max(0, i - 60) : i + 1].sum() * (hours[1] - hours[0]) for i in range(len(hours))])
    excess = 980 * np.exp(-0.5 * ((hours - 8.0) / 2.1) ** 2)
    q_base = 4.0
    discharge = q_base + excess
    alpha, gamma = 0.0025, 0.12
    depth = alpha * np.maximum(0, discharge - q_base) + gamma * rain_6h

    fig, axes = plt.subplots(3, 1, figsize=(9.4, 7.2), sharex=True, gridspec_kw={"height_ratios": [1, 1.15, 1.45]})
    axes[0].bar(hours, rain, width=0.1, color=BRAND, alpha=0.9)
    axes[0].set_ylabel("Rain rate\n(in/h)")
    axes[0].set_title("Eighteen-hour flash-flood simulation at Wilson Creek", loc="left", fontsize=13)
    axes[0].text(0.99, 0.86, "Illustrative storm, not a forecast", transform=axes[0].transAxes, ha="right", color=MUTED, fontsize=8)

    axes[1].plot(hours, discharge, color=INK, linewidth=2)
    axes[1].axhline(q_base, color=MUTED, linestyle="--", linewidth=1)
    axes[1].text(0.3, q_base + 40, "Baseflow 4 cfs", color=MUTED, fontsize=8)
    axes[1].set_ylabel("Discharge\n(cfs)")

    bands = [(0, 0.1, CLEAR, 0.08), (0.1, 0.5, WATCH, 0.16), (0.5, 1.0, WARNING, 0.18), (1.0, 2.0, SEVERE, 0.16), (2.0, 3.2, CRITICAL, 0.14)]
    for lo, hi, color, alpha_fill in bands:
        axes[2].axhspan(lo, hi, color=color, alpha=alpha_fill, linewidth=0)
    axes[2].plot(hours, depth, color=INK, linewidth=2.2)
    axes[2].set_ylabel("Predicted depth\n(ft)")
    axes[2].set_ylim(0, 3.05)
    axes[2].set_xlim(0, 18)
    for ax in axes:
        ax.spines["top"].set_visible(False)
        ax.spines["right"].set_visible(False)
        ax.grid(axis="y", color=LINE, linewidth=0.8)
        ax.set_axisbelow(True)
    axes[2].set_xlabel(
        "Hours from the start of rain\n\nD = 0.0025 · max(0, Q − 4 cfs) + 0.12 · rainfall over the trailing 6 hours. Wilson Creek coefficients from the app."
    )
    finish(fig, FIG / "storm-simulation.png")


def terrain_profile() -> None:
    y = np.linspace(-80, 80, 400)
    x = np.zeros_like(y)
    z = elevation(x, y)
    z_dip = float(z.min())
    water = z_dip + 0.7
    fig, ax = plt.subplots(figsize=(9.4, 3.8))
    ax.fill_between(y, 0, z, color="#d9c7a6", label="Road and channel bed")
    ax.plot(y, z, color=INK, linewidth=1.6)
    wet = z < water
    ax.fill_between(y, z, water, where=wet, color="#7eb6d6", alpha=0.9, interpolate=True, label="0.70 ft water over the dip")
    ax.axhline(z_dip, color=MUTED, linestyle=":", linewidth=1)
    ax.text(-78, z_dip + 0.12, "Dip elevation", color=MUTED, fontsize=9)
    ax.text(-78, 2.55, "0.70 ft of water  ·  Warning", color=WARNING, fontsize=10, fontweight="bold")
    ax.set_xlim(-80, 80)
    ax.set_ylim(0, 3.85)
    ax.set_xlabel("Distance along the road (ft)\n\nSchematic vented ford. Not a surveyed LiDAR transect.")
    ax.set_ylabel("Elevation above datum (ft)")
    ax.set_title("Centerline profile of a schematic low-water crossing", loc="left", fontsize=13)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.legend(frameon=False, loc="upper right")
    finish(fig, FIG / "terrain-profile.png")


def terrain_surface() -> None:
    x = np.linspace(-28, 28, 80)
    y = np.linspace(-80, 80, 140)
    xx, yy = np.meshgrid(x, y)
    zz = elevation(xx, yy)
    fig = plt.figure(figsize=(9.6, 5.6))
    ax = fig.add_subplot(111, projection="3d")
    cmap = LinearSegmentedColormap.from_list("ford", ["#8d6b45", "#d9c7a6", "#e7efe4", "#7ea18a"])
    ax.plot_surface(xx, yy, zz, cmap=cmap, linewidth=0, antialiased=True, shade=True, rcount=80, ccount=50)
    ax.view_init(elev=24, azim=-58)
    ax.set_xlabel("Across channel (ft)", labelpad=12)
    ax.set_ylabel("Along road (ft)", labelpad=16)
    ax.set_zlabel("Elevation (ft)", labelpad=8)
    ax.set_xticks([-20, 0, 20])
    ax.set_yticks([-60, 0, 60])
    ax.set_title("Schematic terrain of the crossing", fontsize=13, pad=8)
    ax.set_box_aspect((1.15, 2.1, 0.48))
    fig.subplots_adjust(left=0.02, right=0.96, bottom=0.12, top=0.9)
    fig.text(
        0.5,
        0.02,
        "Same surface as docs/models/low-water-crossing.stl. Open that file on GitHub to orbit the model.",
        ha="center",
        color=MUTED,
        fontsize=8,
    )
    finish(fig, FIG / "terrain-surface.png")


def water_rise_gif() -> None:
    y = np.linspace(-80, 80, 500)
    z = elevation(np.zeros_like(y), y)
    z_dip = float(z.min())
    depths = np.linspace(0, 2.4, 28)
    frames: list[Image.Image] = []
    for depth in depths:
        if depth < 0.1:
            name, color = "Clear", CLEAR
        elif depth < 0.5:
            name, color = "Watch", WATCH
        elif depth < 1.0:
            name, color = "Warning", WARNING
        elif depth < 2.0:
            name, color = "Severe", SEVERE
        else:
            name, color = "Critical", CRITICAL
        fig, ax = plt.subplots(figsize=(8.6, 3.3))
        water = z_dip + depth
        ax.fill_between(y, 0, z, color="#d9c7a6")
        ax.plot(y, z, color=INK, linewidth=1.4)
        ax.fill_between(y, np.minimum(z, water), water, where=z < water, color="#7eb6d6", interpolate=True)
        ax.set_xlim(-80, 80)
        ax.set_ylim(0, 3.7)
        ax.set_xlabel("Distance along the road (ft)")
        ax.set_ylabel("Elevation (ft)")
        ax.set_title(f"Water-rise simulation    {depth:.2f} ft    {name}", loc="left", color=color, fontsize=13)
        ax.spines["top"].set_visible(False)
        ax.spines["right"].set_visible(False)
        from io import BytesIO

        buffer = BytesIO()
        fig.savefig(buffer, format="png", dpi=110, bbox_inches="tight", pad_inches=0.2)
        plt.close(fig)
        buffer.seek(0)
        frames.append(Image.open(buffer).convert("RGB"))
    FIG.mkdir(parents=True, exist_ok=True)
    frames[0].save(
        FIG / "water-rise.gif",
        save_all=True,
        append_images=frames[1:],
        duration=120,
        loop=0,
        optimize=True,
    )


def weather_qpf() -> None:
    hours = np.arange(0, 13)
    qpf = np.array([0.0, 0.02, 0.08, 0.35, 1.15, 0.72, 0.22, 0.06, 0.0, 0.0, 0.0, 0.0, 0.0])
    cumulative = np.cumsum(qpf)
    fig, ax = plt.subplots(figsize=(9.2, 4.0))
    ax.bar(hours, qpf, color=BRAND, width=0.72, label="Hourly amount")
    ax.axvspan(-0.5, 6.5, color=BRAND, alpha=0.08, linewidth=0)
    twin = ax.twinx()
    twin.plot(hours, cumulative, color=CRITICAL, linewidth=2.2, marker="o", markersize=3.5, label="Running total")
    twin.set_ylabel("Running total (in)", color=CRITICAL)
    twin.spines["top"].set_visible(False)
    twin.tick_params(colors=CRITICAL)
    ax.set_xlabel(
        "Hour\n\nSchematic of an NWS quantitativePrecipitation series. The live app reads the real forecast grid. This is not today’s forecast."
    )
    ax.set_ylabel("Quantitative precipitation (in)")
    ax.set_title("Forecast-rainfall window used by the depth equation", loc="left", fontsize=13)
    ax.set_xlim(-0.6, 12.6)
    ax.set_ylim(0, 1.45)
    ax.spines["top"].set_visible(False)
    ax.grid(axis="y", color=LINE, linewidth=0.8)
    ax.set_axisbelow(True)
    ax.text(0.2, 1.32, "Shaded band: the 6-hour sum the model reads", color=BRAND, fontsize=9)
    finish(fig, FIG / "weather-qpf.png")


def load_gauges() -> dict[str, tuple[list[str], list[float]]]:
    sites = ",".join(GAUGES)
    url = (
        "https://waterservices.usgs.gov/nwis/dv/?format=json"
        f"&sites={sites}&parameterCd=00060&statCd=00003&period=P30D"
    )
    request = urllib.request.Request(url, headers={"User-Agent": "FloodAlertDocs/1.0"})
    with urllib.request.urlopen(request, timeout=30) as response:
        payload = json.load(response)
    found: dict[str, tuple[list[str], list[float]]] = {}
    for series in payload["value"]["timeSeries"]:
        site = series["sourceInfo"]["siteCode"][0]["value"]
        if site not in GAUGES or site in found:
            continue
        days, values = [], []
        for point in series["values"][0]["value"]:
            try:
                values.append(float(point["value"]))
                days.append(point["dateTime"][5:10])
            except (TypeError, ValueError):
                continue
        if values:
            found[site] = (days, values)
    return found


def gauge_hydrographs() -> None:
    try:
        data = load_gauges()
    except Exception as error:
        print(f"USGS chart skipped: {error}")
        return
    fig, ax = plt.subplots(figsize=(9.4, 4.3))
    colors = {"08052745": BRAND, "08059590": INK, "08059000": WARNING}
    for site, (days, values) in data.items():
        ax.plot(range(len(values)), values, color=colors[site], linewidth=1.8, label=f"{GAUGES[site]} ({site})")
    if data:
        ticks = next(iter(data.values()))[0]
        step = max(1, len(ticks) // 6)
        ax.set_xticks(range(0, len(ticks), step), [ticks[i] for i in range(0, len(ticks), step)])
    ax.set_ylabel("Daily mean discharge (cfs)")
    ax.set_xlabel("Date\n\nUSGS daily values, parameter 00060, statistic 00003. Provisional data can be revised.")
    ax.set_title("Thirty days of USGS discharge at the gauges the app uses", loc="left", fontsize=13)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.grid(axis="y", color=LINE, linewidth=0.8)
    ax.set_axisbelow(True)
    ax.legend(frameon=False, fontsize=8)
    ax.set_ylim(bottom=0)
    finish(fig, FIG / "gauge-hydrographs.png")


def normal(a, b, c):
    u = np.subtract(b, a)
    v = np.subtract(c, a)
    n = np.cross(u, v)
    length = float(np.linalg.norm(n))
    if length == 0:
        return (0.0, 0.0, 1.0)
    n = n / length
    return (float(n[0]), float(n[1]), float(n[2]))


def write_stl() -> None:
    xs = np.linspace(-28, 28, 36)
    ys = np.linspace(-80, 80, 64)
    zz = elevation(xs[None, :], ys[:, None])
    base = float(zz.min()) - 0.4
    triangles = []

    def quad(p00, p10, p11, p01, flip=False):
        if flip:
            triangles.append((p00, p11, p10))
            triangles.append((p00, p01, p11))
        else:
            triangles.append((p00, p10, p11))
            triangles.append((p00, p11, p01))

    for j in range(len(ys) - 1):
        for i in range(len(xs) - 1):
            p00 = (xs[i], ys[j], zz[j, i])
            p10 = (xs[i + 1], ys[j], zz[j, i + 1])
            p11 = (xs[i + 1], ys[j + 1], zz[j + 1, i + 1])
            p01 = (xs[i], ys[j + 1], zz[j + 1, i])
            quad(p00, p10, p11, p01)
            quad(
                (xs[i], ys[j], base),
                (xs[i + 1], ys[j], base),
                (xs[i + 1], ys[j + 1], base),
                (xs[i], ys[j + 1], base),
                flip=True,
            )
    for j in range(len(ys) - 1):
        quad(
            (xs[0], ys[j], base),
            (xs[0], ys[j], zz[j, 0]),
            (xs[0], ys[j + 1], zz[j + 1, 0]),
            (xs[0], ys[j + 1], base),
        )
        quad(
            (xs[-1], ys[j], base),
            (xs[-1], ys[j + 1], base),
            (xs[-1], ys[j + 1], zz[j + 1, -1]),
            (xs[-1], ys[j], zz[j, -1]),
        )
    for i in range(len(xs) - 1):
        quad(
            (xs[i], ys[0], base),
            (xs[i + 1], ys[0], base),
            (xs[i + 1], ys[0], zz[0, i + 1]),
            (xs[i], ys[0], zz[0, i]),
        )
        quad(
            (xs[i], ys[-1], base),
            (xs[i], ys[-1], zz[-1, i]),
            (xs[i + 1], ys[-1], zz[-1, i + 1]),
            (xs[i + 1], ys[-1], base),
        )

    MODEL.mkdir(parents=True, exist_ok=True)
    path = MODEL / "low-water-crossing.stl"
    with path.open("wb") as handle:
        handle.write(b"Flood Alert schematic low-water crossing, units feet".ljust(80, b"\0"))
        handle.write(struct.pack("<I", len(triangles)))
        for tri in triangles:
            handle.write(struct.pack("<3f", *normal(*tri)))
            for vertex in tri:
                handle.write(struct.pack("<3f", *vertex))
            handle.write(struct.pack("<H", 0))
    print(f"STL triangles: {len(triangles)}")


def main() -> None:
    style()
    hazard_bands()
    storm_simulation()
    terrain_profile()
    terrain_surface()
    water_rise_gif()
    weather_qpf()
    gauge_hydrographs()
    write_stl()
    print(f"Wrote figures to {FIG}")


if __name__ == "__main__":
    main()
