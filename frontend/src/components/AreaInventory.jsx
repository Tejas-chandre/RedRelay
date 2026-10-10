import { useMemo, useState } from "react";
import "./AreaInventory.css";

const BLOOD_GROUPS = ["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"];

export function AreaInventory({ hospitals = [] }) {
    const [selectedArea, setSelectedArea] = useState("all");
    const [selectedGroup, setSelectedGroup] = useState("all");
    const [selectedType, setSelectedType] = useState("all");
    const [search, setSearch] = useState("");

    // Build area options from existing project data.
    const areas = useMemo(() => {
        const values = hospitals.flatMap((hospital) =>
            [hospital.location, hospital.zone].filter(Boolean)
        );

        return [...new Set(values)].sort((a, b) => a.localeCompare(b));
    }, [hospitals]);

    const areaHospitals = useMemo(() => {
        if (selectedArea === "all") return hospitals;

        return hospitals.filter(
            (hospital) =>
                hospital.location === selectedArea ||
                hospital.zone === selectedArea
        );
    }, [hospitals, selectedArea]);

    // Calculate totals from the current hospital state, not hardcoded numbers.
    const totals = useMemo(() => {
        return BLOOD_GROUPS.reduce((result, group) => {
            result[group] = areaHospitals.reduce(
                (sum, hospital) => sum + Math.max(0, Number(hospital.bloodStock?.[group]) || 0),
                0
            );
            return result;
        }, {});
    }, [areaHospitals]);

    const totalUnits = Object.values(totals).reduce(
        (sum, count) => sum + count,
        0
    );

    const filteredHospitals = useMemo(() => {
        return areaHospitals.filter((hospital) => {
            const matchesGroup =
                selectedGroup === "all" ||
                (Number(hospital.bloodStock?.[selectedGroup]) || 0) > 0;

            const facilityText = `${hospital.name || ""} ${hospital.facility || ""} ${hospital.location || ""
                } ${hospital.zone || ""}`.toLowerCase();

            const matchesSearch = facilityText.includes(search.trim().toLowerCase());

            // The existing data doesn't have a dedicated facility category field.
            // Use the available type description for a basic hospital/blood-bank filter.
            const typeText = `${hospital.type || ""} ${hospital.facility || ""}`.toLowerCase();

            const matchesType =
                selectedType === "all" ||
                (selectedType === "bloodbank" &&
                    /blood bank|blood center|blood centre|blood storage/.test(typeText)) ||
                (selectedType === "hospital" &&
                    !/blood bank|blood center|blood centre/.test(typeText));

            return matchesGroup && matchesSearch && matchesType;
        });
    }, [areaHospitals, selectedGroup, selectedType, search]);

    return (
        <section className="area-inventory-section">
            <div className="area-inventory-heading">
                <div>
                    <span className="area-inventory-eyebrow">REGIONAL BLOOD SEARCH</span>
                    <h2>Blood Availability by Area</h2>
                    <p>
                        View blood-group stock across the facilities currently listed in
                        the RedRelay network.
                    </p>
                </div>
                <span className="area-inventory-demo-badge">DEMO INVENTORY</span>
            </div>

            <div className="area-inventory-filters">
                <label>
                    Select Area
                    <select
                        value={selectedArea}
                        onChange={(event) => setSelectedArea(event.target.value)}
                    >
                        <option value="all">All listed areas</option>
                        {areas.map((area) => (
                            <option value={area} key={area}>
                                {area}
                            </option>
                        ))}
                    </select>
                </label>

                <label>
                    Blood Group
                    <select
                        value={selectedGroup}
                        onChange={(event) => setSelectedGroup(event.target.value)}
                    >
                        <option value="all">All blood groups</option>
                        {BLOOD_GROUPS.map((group) => (
                            <option value={group} key={group}>
                                {group}
                            </option>
                        ))}
                    </select>
                </label>

                <label>
                    Facility Type
                    <select
                        value={selectedType}
                        onChange={(event) => setSelectedType(event.target.value)}
                    >
                        <option value="all">All facilities</option>
                        <option value="hospital">Hospitals / other facilities</option>
                        <option value="bloodbank">Blood banks / blood centres</option>
                    </select>
                </label>

                <label>
                    Search Facility
                    <input
                        type="search"
                        placeholder="Search name or location"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                    />
                </label>
            </div>

            <div className="area-inventory-summary">
                <article className="area-summary-card">
                    <span>Available Blood Units</span>
                    <strong>{totalUnits}</strong>
                    <small>Calculated from listed facilities</small>
                </article>

                <article className="area-summary-card">
                    <span>Facilities in Area</span>
                    <strong>{areaHospitals.length}</strong>
                    <small>Before applying search filters</small>
                </article>

                <article className="area-summary-card">
                    <span>Matching Facilities</span>
                    <strong>{filteredHospitals.length}</strong>
                    <small>Based on your selected filters</small>
                </article>
            </div>

            <h3 className="area-inventory-subheading">
                Blood-Group Availability
            </h3>

            <div className="area-blood-group-grid">
                {BLOOD_GROUPS.map((group) => (
                    <button
                        type="button"
                        key={group}
                        className={`area-blood-card ${selectedGroup === group ? "is-selected" : ""
                            }`}
                        onClick={() =>
                            setSelectedGroup((current) =>
                                current === group ? "all" : group
                            )
                        }
                        aria-pressed={selectedGroup === group}
                    >
                        <span className="area-blood-symbol">+</span>
                        <span className="area-blood-name">{group}</span>
                        <strong>{totals[group]}</strong>
                        <small>units</small>
                    </button>
                ))}
            </div>

            <div className="area-facility-heading">
                <div>
                    <h3 className="area-inventory-subheading">Facilities &amp; Stock</h3>
                    <p>
                        {selectedArea === "all" ? "All listed areas" : selectedArea}
                    </p>
                </div>
                <span className="area-result-count">
                    {filteredHospitals.length} results
                </span>
            </div>

            {filteredHospitals.length > 0 ? (
                <div className="area-facility-grid">
                    {filteredHospitals.map((hospital) => {
                        const facilityTotal = BLOOD_GROUPS.reduce(
                            (sum, group) =>
                                sum + Math.max(0, Number(hospital.bloodStock?.[group]) || 0),
                            0
                        );

                        return (
                            <article className="area-facility-card" key={hospital.id}>
                                <div className="area-facility-card-header">
                                    <div className="area-facility-icon">
                                        {hospital.name?.toLowerCase().includes("blood") ||
                                            hospital.facility?.toLowerCase().includes("blood")
                                            ? "B"
                                            : "H"}
                                    </div>

                                    <div className="area-facility-details">
                                        <h4>{hospital.name}</h4>
                                        <p>{hospital.facility}</p>
                                        <span>
                                            {hospital.location || "Location not specified"}
                                            {hospital.zone ? ` · ${hospital.zone}` : ""}
                                        </span>
                                    </div>

                                    <span
                                        className={`area-facility-status ${(
                                            hospital.state || "unknown"
                                        ).toLowerCase()}`}
                                    >
                                        {hospital.state || "Unknown"}
                                    </span>
                                </div>

                                <div className="area-facility-metrics">
                                    <div>
                                        <span>Total units</span>
                                        <strong>{facilityTotal}</strong>
                                    </div>
                                    <div>
                                        <span>Listed distance</span>
                                        <strong>
                                            {Number.isFinite(Number(hospital.distanceKm))
                                                ? `${hospital.distanceKm} km`
                                                : "Not available"}
                                        </strong>
                                    </div>
                                </div>

                                <div className="area-facility-stock">
                                    {BLOOD_GROUPS.map((group) => {
                                        const units = Math.max(
                                            0,
                                            Number(hospital.bloodStock?.[group]) || 0
                                        );

                                        return (
                                            <div className="area-stock-cell" key={group}>
                                                <span>{group}</span>
                                                <strong className={units === 0 ? "no-stock" : ""}>
                                                    {units}
                                                </strong>
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="area-facility-footer">
                                    <span>
                                        Updated: {hospital.lastUpdated || "Not available"}
                                    </span>
                                    <span className="area-demo-label">Demo data</span>
                                </div>
                            </article>
                        );
                    })}
                </div>
            ) : (
                <div className="area-inventory-empty">
                    <h4>No matching facilities found</h4>
                    <p>
                        Try another area, blood group, facility type, or search term.
                    </p>
                    <button
                        type="button"
                        onClick={() => {
                            setSelectedArea("all");
                            setSelectedGroup("all");
                            setSelectedType("all");
                            setSearch("");
                        }}
                    >
                        Clear filters
                    </button>
                </div>
            )}

            <p className="area-inventory-disclaimer">
                Demo data only. Stock quantities and distances are taken from the
                project's current simulated hospital records. They do not represent
                verified real-world availability or actual geographic proximity.
            </p>
        </section>
    );
}
