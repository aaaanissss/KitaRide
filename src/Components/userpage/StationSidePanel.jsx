import React, { useState, useEffect } from "react";
import { FaPlus, FaEllipsisV } from "react-icons/fa";
import RidershipNext7Chart from "./RidershipNext7Chart.jsx";
import ExplorePanel from "./ExplorePanel.jsx";
import "./StationSidePanelAutofill.css";

export default function StationSidePanel({
  isOpen,
  onToggle,
  selectedStation,
  onClearStation,
  onStationClick,
  next7Predictions,
  nearestStationFromUser,
  requestUserLocation,
  isLocLoading,
  locError,
  allStations,
  onAttractionSearchResults,
  onToggleAttractionMarkers,
  onFitAttractions, 
  onHighlightAttraction, 
  selectedAttractionId,
  attractionNearbyStations = [],
}) {
  // attractions for the currently selected station
  const [stationAttractions, setStationAttractions] = useState([]);
  const [isLoadingAttractions, setIsLoadingAttractions] = useState(false);
  const [attractionsError, setAttractionsError] = useState(null);

  // add-attraction modal + form
  const [showAddAttractionForm, setShowAddAttractionForm] = useState(false);
  const [addAttractionForm, setAddAttractionForm] = useState({
    name: "",
    category: "",
    address: "",
    website: "",
    mapLocation: "",
    openingHours: "",
    distanceMeters: "",
    travelTimeMinutes: "",
    commuteOption: "",
    atrLatitude: "",
    atrLongitude: "",
  });
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  
  // Smart autofill states
  const [searchResults, setSearchResults] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState(null);

  // Missing-fields prompt (for NEW attraction only)
  const [showMissingPrompt, setShowMissingPrompt] = useState(false);
  const [missingFields, setMissingFields] = useState([]);
  const [skipMissingPromptOnce, setSkipMissingPromptOnce] = useState(false);

  // per-attraction menu (edit / delete request)
  const [activeAttractionForAction, setActiveAttractionForAction] = useState(null);

  // review form state
  const [reviewForm, setReviewForm] = useState({
    atrid: null,
    rating: 5,
    comment: "",
    loading: false,
    error: "",
  });

  // list of reviews for one attraction
  const [reviewsState, setReviewsState] = useState({
    atrid: null,
    loading: false,
    error: "",
    items: [],
    expanded: false,
  });

  // three-dot menu + request modals
  const [showEditRequestModal, setShowEditRequestModal] = useState(false);
  const [showDeleteRequestModal, setShowDeleteRequestModal] = useState(false);
  const [editPhotoFile, setEditPhotoFile] = useState(null);
  const [editPhotoPreview, setEditPhotoPreview] = useState(null);

  const [editRequestForm, setEditRequestForm] = useState({
    name: "",
    category: "",
    address: "",
    website: "",
    mapLocation: "",
    openingHours: "",
    distanceMeters: "",
    travelTimeMinutes: "",
    commuteOption: "",
    atrLatitude: "",
    atrLongitude: "",
  });

  const [deleteReason, setDeleteReason] = useState("");

  const [menuOpenAtrId, setMenuOpenAtrId] = useState(null);
  

  // ---------- helpers ----------

  function getMissingImportantFields(form) {
    const missing = [];

    const name = form.name?.trim();
    const category = form.category?.trim();
    const map = form.mapLocation?.trim();
    const lat = String(form.atrLatitude ?? "").trim();
    const lng = String(form.atrLongitude ?? "").trim();

    // required
    if (!name) missing.push({ label: "Name", required: true });
    if (!category) missing.push({ label: "Category", required: true });

    const hasCoords = lat !== "" && lng !== "";
    const hasMap = map !== "";

    if (!hasMap && !hasCoords) {
      missing.push({
        label: "Map link OR Coordinates (Latitude + Longitude)",
        required: true,
      });
    }

    // required
    if (!form.address?.trim())
      missing.push({ label: "Address", required: true });

    // recommended (prompt only)
    if (!form.openingHours?.trim())
      missing.push({ label: "Opening hours", required: false });
    return missing;
  }

  const handleAddAttractionChange = (field, value) => {
    setAddAttractionForm((prev) => ({ ...prev, [field]: value }));
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0] || null;
    setPhotoFile(file);
    if (file) {
      setPhotoPreview(URL.createObjectURL(file));
    } else {
      setPhotoPreview(null);
    }
  };

  // Smart search functionality
  const searchSimilarAttractions = async (searchTerm) => {
    const q = searchTerm?.trim() || "";

    if (q.length < 2) {
      setSearchResults([]);
      setShowSuggestions(false);
      return;
    }

    try {
      setIsSearching(true);

      const res = await fetch(`/api/attractions/similar?q=${encodeURIComponent(q)}`);

      if (!res.ok) {
        setSearchResults([]);
        setShowSuggestions(false);
        return;
      }

      const data = await res.json();
      const list = data.attractions || [];

      setSearchResults(list);
      setShowSuggestions(list.length > 0);   // ✅ IMPORTANT
    } catch (err) {
      console.error("Error searching similar attractions:", err);
      setSearchResults([]);
      setShowSuggestions(false);
    } finally {
      setIsSearching(false);
    }
  };

  // Parse Google Maps URL for coordinates
  const parseGoogleMapsUrl = (url) => {
    if (!url || typeof url !== 'string') return null;
    
    try {
      // Match patterns like: @3.1529,101.7094 or q=place@lat,lng
      const coordMatch = url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
      if (coordMatch) {
        return {
          latitude: parseFloat(coordMatch[1]),
          longitude: parseFloat(coordMatch[2])
        };
      }
      
      // Extract place name from q parameter
      const placeMatch = url.match(/[?&]q=([^&]+)/);
      if (placeMatch) {
        return { placeName: decodeURIComponent(placeMatch[1]) };
      }
    } catch (err) {
      console.error("Error parsing Google Maps URL:", err);
    }
    return null;
  };

  // Auto-fill form from selected suggestion
  const autofillFromSuggestion = (attraction) => {
    const autofilledForm = {
      name: attraction.atrname || "",
      category: attraction.atrcategory || "",
      address: attraction.atraddress || "",
      website: attraction.atrwebsite || "",
      mapLocation: attraction.atrmaplocation || "",
      openingHours: attraction.openinghours || "",
      atrLatitude: attraction.atrlatitude?.toString() || "",
      atrLongitude: attraction.atrlongitude?.toString() || "",
      // Leave blank for user to fill:
      distanceMeters: "",
      travelTimeMinutes: "",
      commuteOption: "",
    };
    
    setAddAttractionForm(autofilledForm);
    setPhotoFile(null);
    setPhotoPreview(attraction.coverimageurl || null);
    setShowSuggestions(false);
    setSearchResults([]);
    setSelectedSuggestion(attraction);
    
    // Set photo preview if existing attraction has image
    if (attraction.coverimageurl) {
      setPhotoPreview(attraction.coverimageurl);
    }
  };

  // Handle name input with debounced search
  const handleNameChange = (e) => {
    const value = e.target.value;
    // update name
    setAddAttractionForm((prev) => ({ ...prev, name: value }));
    // if user types manually, stop treating it as an existing attraction
    setSelectedSuggestion(null);
    // Clear previous timeout
    if (searchTimeout) clearTimeout(searchTimeout);
    if (value.trim().length >= 2) setShowSuggestions(true);    // Debounced search
    const newTimeout = setTimeout(() => {
      searchSimilarAttractions(value);
    }, 300);
    setSearchTimeout(newTimeout);
  };

  // Handle map location input (check for Google Maps URL)
  const handleMapLocationChange = (e) => {
    const value = e.target.value;
    setAddAttractionForm({ ...addAttractionForm, mapLocation: value });
    
    // Auto-parse coordinates if it's a Google Maps URL
    const parsed = parseGoogleMapsUrl(value);
    if (parsed) {
      if (parsed.latitude && parsed.longitude) {
        setAddAttractionForm(prev => ({
          ...prev,
          atrLatitude: parsed.latitude.toString(),
          atrLongitude: parsed.longitude.toString()
        }));
      } else if (parsed.placeName && !addAttractionForm.name) {
        // Use place name as attraction name if name is empty
        setAddAttractionForm(prev => ({
          ...prev,
          name: parsed.placeName
        }));
      }
    }
  };

  const ATTRACTION_CATEGORIES = [
    "Mosque",
    "Landmark",
    "Shopping Mall",
    "Restaurants & Cafe",
    "Themepark",
    "Stadium",
    "Park",
  ];

  const resetAddAttractionForm = () => {
    setAddAttractionForm({
      name: "",
      category: "",
      address: "",
      website: "",
      mapLocation: "",
      openingHours: "",
      distanceMeters: "",
      travelTimeMinutes: "",
      commuteOption: "",
      atrLatitude: "",
      atrLongitude: "",
    });
    setPhotoFile(null);
    setPhotoPreview(null);
    setSearchResults([]);
    setShowSuggestions(false);
    setSelectedSuggestion(null);
    setIsSearching(false);
  };

  const closeAddAttractionForm = () => {
    setShowAddAttractionForm(false);
    resetAddAttractionForm();
  };

  const openAddAttractionForm = () => {
    setShowAddAttractionForm(true);
  };

  const openAttractionMenu = (attraction) => {
    setMenuOpenAtrId(attraction.atrid);
  };

  const closeAttractionMenu = () => {
    setMenuOpenAtrId(null);
  };

  const openEditRequestModal = (attraction) => {
    setActiveAttractionForAction(attraction);

    setEditRequestForm({
      name: attraction.atrname || "",
      category: attraction.atrcategory || "",
      address: attraction.atraddress || "",
      website: attraction.atrwebsite || "",
      mapLocation: attraction.atrmaplocation || "",
      openingHours: attraction.openinghours || "",
      distanceMeters: attraction.distance != null ? String(attraction.distance) : "",
      travelTimeMinutes: attraction.traveltimeminutes != null ? String(attraction.traveltimeminutes) : "",
      commuteOption: attraction.commuteoption || "",
      atrLatitude: attraction.atrlatitude != null ? String(attraction.atrlatitude) : "",
      atrLongitude: attraction.atrlongitude != null ? String(attraction.atrlongitude) : "",
    });

    setEditPhotoFile(null);
    setEditPhotoPreview(attraction.coverimageurl || null);
    setShowEditRequestModal(true);
    setMenuOpenAtrId(null); // close menu only
  };

  const closeEditRequestModal = () => {
    setShowEditRequestModal(false);
    setEditRequestForm({
      name: "",
      category: "",
      address: "",
      website: "",
      mapLocation: "",
      openingHours: "",
      distanceMeters: "",
      travelTimeMinutes: "",
      commuteOption: "",
      atrLatitude: "",
      atrLongitude: "",
    });
    setEditPhotoFile(null);
    setEditPhotoPreview(null);
  };

  const openDeleteRequestModal = (attraction) => {
    setActiveAttractionForAction(attraction);
    setDeleteReason("");
    setShowDeleteRequestModal(true);
    setMenuOpenAtrId(null); // close menu only
  };

  const closeDeleteRequestModal = () => {
    setShowDeleteRequestModal(false);
    setDeleteReason("");
  };

  const openReviewForm = (attraction) => {
    setReviewForm({
      atrid: attraction.atrid,
      rating: 5,
      comment: "",
      loading: false,
      error: "",
    });
  };

  // ---------- API calls (attractions & reviews) ----------

  async function loadAttractionsForStation(stationID) {
    try {
      setIsLoadingAttractions(true);
      setAttractionsError(null);
      setStationAttractions([]);

      const res = await fetch(`/api/stations/${stationID}/attractions`);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      setStationAttractions(data.attractions || []);
    } catch (err) {
      console.error("Failed to load attractions for station", stationID, err);
      setAttractionsError("Failed to load nearby attractions.");
    } finally {
      setIsLoadingAttractions(false);
    }
  }

  // whenever selectedStation changes, load its attractions
  useEffect(() => {
    if (selectedStation?.stationID) {
      loadAttractionsForStation(selectedStation.stationID);
    } else {
      setStationAttractions([]);
    }
  }, [selectedStation]);

  // whenever selectedSuggestion changes, lock photo upload + show shared photo
  useEffect(() => {
    if (selectedSuggestion) {
      setPhotoFile(null);
      setPhotoPreview(selectedSuggestion.coverimageurl || null);
    }
  }, [selectedSuggestion]);

  const handleSubmitAddAttraction = async (e) => {
    e.preventDefault();
    if (!selectedStation) return;

    const token = localStorage.getItem("authToken");
    if (!token) {
      alert("Please log in to suggest an attraction.");
      return;
    }

    const isAutofill = !!selectedSuggestion; // existing attraction selected
    const isNewAttraction = !isAutofill;

    // ---- NEW: prompt missing important fields ONLY for new attractions ----
    if (isNewAttraction && !skipMissingPromptOnce) {
      const missing = getMissingImportantFields(addAttractionForm);

      const requiredMissing = missing.filter((m) => m.required);
      if (requiredMissing.length > 0) {
        alert(
          "❌ Please fill required fields:\n- " +
            requiredMissing.map((m) => m.label).join("\n- ")
        );
        return;
      }

      const recommendedMissing = missing.filter((m) => !m.required);
      if (recommendedMissing.length > 0) {
        setMissingFields(recommendedMissing);
        setShowMissingPrompt(true);
        return;
      }
    }

    // reset skip flag after using it once
    if (skipMissingPromptOnce) setSkipMissingPromptOnce(false);

    // Validate required fields before submission (keep your original name check)
    const name = addAttractionForm.name?.trim();
    if (!name) {
      alert("❌ Please enter an attraction name before submitting.");
      return;
    }

    try {
      const payload = {
        stationID: selectedStation.stationID,
        name: name,
        category: addAttractionForm.category.trim(),
        address: addAttractionForm.address.trim(),
        website: addAttractionForm.website.trim(),
        mapLocation: addAttractionForm.mapLocation.trim(),
        openingHours: addAttractionForm.openingHours.trim(),
        distanceMeters: addAttractionForm.distanceMeters.trim(),
        travelTimeMinutes: addAttractionForm.travelTimeMinutes.trim(),
        commuteOption: addAttractionForm.commuteOption.trim(),
        atrLatitude: addAttractionForm.atrLatitude.trim(),
        atrLongitude: addAttractionForm.atrLongitude.trim(),
        existingAtrId: selectedSuggestion?.atrid ?? null,
      };

      const formData = new FormData();
      formData.append("data", JSON.stringify(payload));
      if (photoFile && !selectedSuggestion) {
        formData.append("photo", photoFile);
      }

      const res = await fetch(
        `/api/stations/${selectedStation.stationID}/attractions`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        }
      );

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || errBody.message || `HTTP ${res.status}`);
      }

      alert("✅ Your attraction suggestion has been sent for review.");
      closeAddAttractionForm();
      await loadAttractionsForStation(selectedStation.stationID);
    } catch (err) {
      console.error("Failed to submit attraction suggestion", err);
      alert(err.message || "❌ Failed to send suggestion. Please try again later.");
    }
  };

  // EDIT request submit
  const handleSubmitEditRequest = async (e) => {
    e.preventDefault();
    if (!selectedStation || !activeAttractionForAction) return;

    const token = localStorage.getItem("authToken");
    if (!token) {
      alert("Please log in to request an edit.");
      return;
    }

    const distanceVal =
      editRequestForm.distanceMeters !== "" ? Number(editRequestForm.distanceMeters) : null;
    const travelTimeVal =
      editRequestForm.travelTimeMinutes !== "" ? Number(editRequestForm.travelTimeMinutes) : null;
    const latVal =
      editRequestForm.atrLatitude !== "" ? Number(editRequestForm.atrLatitude) : null;
    const lngVal =
      editRequestForm.atrLongitude !== "" ? Number(editRequestForm.atrLongitude) : null;

    const requestedChanges = {
      atrname: editRequestForm.name.trim() || null,
      atrcategory: editRequestForm.category.trim() || null,
      atraddress: editRequestForm.address.trim() || null,
      atrwebsite: editRequestForm.website.trim() || null,
      atrmaplocation: editRequestForm.mapLocation.trim() || null,
      openinghours: editRequestForm.openingHours.trim() || null,
      distance: distanceVal,
      traveltimeminutes: travelTimeVal,
      commuteoption: editRequestForm.commuteOption.trim() || null,
      atrlatitude: latVal,
      atrlongitude: lngVal,
    };

    // send a payload shape that your backend is most likely expecting
    const payload = {
      requestType: "edit",
      request_type: "edit",

      stationID: selectedStation.stationID,
      atrid: activeAttractionForAction.atrid,

      reason: null,

      requestedChanges,
      requested_changes: requestedChanges,
    };

    try {
      const useFormData = Boolean(editPhotoFile);

      const res = await fetch("/api/attractions/requests", {
        method: "POST",
        headers: useFormData
          ? { Authorization: `Bearer ${token}` }
          : {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
        body: useFormData
          ? (() => {
              const fd = new FormData();
              fd.append("data", JSON.stringify(payload));
              fd.append("photo", editPhotoFile);
              return fd;
            })()
          : JSON.stringify(payload),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || errBody.message || `HTTP ${res.status}`);
      }

      alert("✅ Your edit request has been sent to the admin.");
      closeEditRequestModal();
    } catch (err) {
      console.error("Failed to send edit request", err);
      alert(err.message || "❌ Failed to send edit request. Please try again.");
    }
  };


  // DELETE request submit
  const handleSubmitDeleteRequest = async (e) => {
    e.preventDefault();
    if (!selectedStation || !activeAttractionForAction) return;

    const token = localStorage.getItem("authToken");
    if (!token) {
      alert("Please log in to request deletion.");
      return;
    }

    try {
      const res = await fetch("/api/attractions/requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          requestType: "delete",
          request_type: "delete",
          stationID: selectedStation.stationID,
          atrid: activeAttractionForAction.atrid,
          reason: deleteReason.trim() || null,
          requestedChanges: null,
          requested_changes: null,
        })
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.message || `HTTP ${res.status}`);
      }

      alert("✅ Your deletion request has been sent to the admin.");
      closeDeleteRequestModal();
    } catch (err) {
      console.error("Failed to send delete request", err);
      alert(err.message || "❌ Failed to send delete request. Please try again.");
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!selectedStation || !reviewForm.atrid) return;

    const token = localStorage.getItem("authToken");
    if (!token) {
      alert("Please log in to write a review.");
      return;
    }

    try {
      setReviewForm((prev) => ({ ...prev, loading: true, error: "" }));

      const res = await fetch(`/api/attractions/${reviewForm.atrid}/reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          rating: Number(reviewForm.rating),
          review: reviewForm.comment.trim(),
        }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.message || `HTTP ${res.status}`);
      }

      await loadAttractionsForStation(selectedStation.stationID);

      setReviewForm({
        atrid: null,
        rating: 5,
        comment: "",
        loading: false,
        error: "",
      });

      alert("✅ Your review has been saved.");
    } catch (err) {
      console.error("Failed to submit review", err);
      setReviewForm((prev) => ({
        ...prev,
        loading: false,
        error: err.message || "Failed to submit review.",
      }));
    }
  };

  const toggleViewReviews = async (attraction) => {
    if (!attraction?.atrid) return;

    if (
      reviewsState.atrid === attraction.atrid &&
      reviewsState.expanded &&
      !reviewsState.loading
    ) {
      setReviewsState((prev) => ({ ...prev, expanded: false }));
      return;
    }

    setReviewsState({
      atrid: attraction.atrid,
      loading: true,
      error: "",
      items: [],
      expanded: true,
    });

    try {
      const res = await fetch(`/api/attractions/${attraction.atrid}/reviews`);
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.message || `HTTP ${res.status}`);
      }

      const data = await res.json();
      setReviewsState((prev) => ({
        ...prev,
        loading: false,
        items: data.reviews || [],
      }));
    } catch (err) {
      console.error("Failed to load reviews", err);
      setReviewsState((prev) => ({
        ...prev,
        loading: false,
        error: err.message || "Failed to load reviews.",
      }));
    }
  };

  // ---------- render ----------

  const sortedAttractions = React.useMemo(() => {
    if (!stationAttractions) return [];
    if (!selectedAttractionId) return stationAttractions;

    // Selected first, others after
    return [...stationAttractions].sort((a, b) => {
      const aSel = a.atrid === selectedAttractionId;
      const bSel = b.atrid === selectedAttractionId;

      if (aSel && !bSel) return -1;
      if (!aSel && bSel) return 1;
      return 0;
    });
  }, [stationAttractions, selectedAttractionId]);

  const sidePanelClass = "sidePanel" + (isOpen ? " sidePanel--open" : " sidePanel--collapsed");

  const lineNames = selectedStation?.lines?.map((l) => l.lineName) ?? [];
  // if this station includes KTM, use the global KTM wording
  const isKtmStation = lineNames.some((n) => String(n).toLowerCase().includes("ktm"));
  
  return (
    <>
      {/* main side panel */}
      <div className={sidePanelClass}>
        <button
          className="sidePanel-toggle"
          onClick={onToggle}
          aria-label={isOpen ? "Collapse panel" : "Expand panel"}
        >
          {isOpen ? "‹" : "›"}
        </button>

        <div className="sidePanel-inner">
          {selectedStation ? (
            <>
              <div className="sidePanel-header">
                <h2>🚆 {selectedStation.stationName}</h2>
                <button
                  className="sidePanel-close"
                  onClick={onClearStation}
                  title="Clear selection"
                >
                  ✕
                </button>
              </div>

              <p>
                <strong>Lines:</strong>{" "}
                {selectedStation.lines.map((l) => l.lineName).join(" / ")}
              </p>

              {Array.isArray(attractionNearbyStations) && attractionNearbyStations.length > 1 && (
                <div
                  style={{
                    marginTop: 8,
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: "1px solid #e2e8f0",
                    background: "#f8fafc",
                  }}
                >
                  <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 13 }}>
                    🚉 Nearby stations for this attraction
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {attractionNearbyStations.map((s) => (
                      <button
                        key={s.stationID}
                        type="button"
                        className="btnSecondary"
                        style={{ textAlign: "left" }}
                        onClick={() => onStationClick?.(s)}
                      >
                        {s.stationName} ({s.stationID})
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <hr className="sectionDivider" />

              {/* chart section */}
              <div className="overlaySection">
                <h4
                  style={{
                    marginBottom: "10px",
                    lineHeight: 1.3,
                  }}
                >
                  📈 Next 7 Days Ridership Prediction{" "}
                  {isKtmStation ? (
                    <>
                      for <span style={{ fontWeight: 600 }}>all KTM Komuter Lines</span>
                    </>
                  ) : lineNames.length > 0 ? (
                    <>
                      for <span style={{ fontWeight: 600 }}>{lineNames.join(" / ")}</span>
                    </>
                  ) : null}
                </h4>

                <RidershipNext7Chart
                  predictions={next7Predictions}
                  lineNames={lineNames}
                />
                <p
                  style={{
                    fontSize: "11px",
                    color: "#777",
                    marginTop: "6px",
                    fontStyle: "italic",
                  }}
                >
                  *Model trained on 2019–2024 historical ridership (data.gov.my), Malaysia holiday
                  calendar (timeanddate.com)
                </p>
              </div>

              <hr className="sectionDivider" />

              {/* attractions section */}
              <div className="overlaySection--attractions">
                <div className="overlaySectionHeader">
                  <h4>🎯 Nearby Attractions</h4>
                  {selectedStation && (
                    <button
                      className="addAttractionBtn"
                      onClick={openAddAttractionForm}
                      title="Suggest a new attraction near this station"
                    >
                      <FaPlus size={12} />
                    </button>
                  )}
                </div>

                {isLoadingAttractions && (
                  <p style={{ fontSize: 13, color: "#777" }}>
                    Loading attractions…
                  </p>
                )}

                {attractionsError && (
                  <p style={{ fontSize: 13, color: "crimson" }}>
                    {attractionsError}
                  </p>
                )}

                {!isLoadingAttractions &&
                  !attractionsError &&
                  stationAttractions.length === 0 && (
                    <p style={{ fontSize: 13, color: "#777" }}>
                      No attractions have been added for this station yet.
                    </p>
                  )}

                {!isLoadingAttractions && !attractionsError && sortedAttractions.length > 0 && (
                  <div className="attractionsList">
                    {sortedAttractions.map((a) => (
                      <div
                        key={a.atrid}
                        className={
                          "attractionCard" +
                          (a.atrid === selectedAttractionId
                            ? " attractionCard--active"
                            : "")
                        }
                        onClick={() =>
                          onHighlightAttraction && onHighlightAttraction(a)
                        }
                      >
                          {a.coverimageurl && (
                            <div className="attractionImageWrapper">
                              <img
                                src={a.coverimageurl}
                                alt={a.atrname}
                                className="attractionImage"
                              />
                            </div>
                          )}

                          <div className="attractionContent">
                            <div className="attractionHeaderRow">
                              <h5 style={{ margin: 0 }}>{a.atrname}</h5>

                              <div className="attractionHeaderActions">
                                {a.isverified && (
                                  <span
                                    style={{
                                      fontSize: 11,
                                      padding: "2px 6px",
                                      borderRadius: "999px",
                                      background: "#e0f7ec",
                                      color: "#009645",
                                      alignSelf: "flex-start",
                                    }}
                                  >
                                    Verified
                                  </span>
                                )}

                                <div className="attractionMenuWrapper">
                                  <button
                                    type="button"
                                    className="attractionMenuBtn"
                                    onClick={(e) => {e.stopPropagation(); openAttractionMenu(a)}}
                                    title="Request edit/delete"
                                  >
                                    <FaEllipsisV size={11} />
                                  </button>

                                  {menuOpenAtrId === a.atrid && (
                                    a.atrid && (
                                    <div className="attractionActionMenu">
                                      <button
                                        type="button"
                                        onClick={() => openEditRequestModal(a)}
                                      >
                                        Request edit
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          openDeleteRequestModal(a)
                                        }
                                      >
                                        Request delete
                                      </button>
                                      <button
                                        type="button"
                                        className="attractionActionMenu-cancel"
                                        onClick={closeAttractionMenu}
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                            <p
                              style={{
                                margin: "2px 0 4px",
                                fontSize: 12,
                                color: "#555",
                              }}
                            >
                              {a.atrcategory}
                            </p>

                            {a.atraddress && (
                              <p
                                style={{
                                  margin: 0,
                                  fontSize: 12,
                                  color: "#666",
                                }}
                              >
                                📍 {a.atraddress}
                              </p>
                            )}

                            <p
                              style={{
                                margin: "4px 0 0",
                                fontSize: 12,
                                color: "#444",
                              }}
                            >
                              {a.distance != null && (
                                <>
                                  🛣 {a.distance} m{" · "}
                                </>
                              )}
                              {a.traveltimeminutes != null && (
                                <>
                                  ⏱ {a.traveltimeminutes} min{" · "}
                                </>
                              )}
                              {a.commuteoption && <> {a.commuteoption}</>}
                            </p>

                            {(a.averagerating || a.reviewcount) && (
                              <p
                                style={{
                                  margin: "4px 0 0",
                                  fontSize: 12,
                                  color: "#444",
                                }}
                              >
                                ⭐
                                {Number(a.averagerating || 0).toFixed(1)} (
                                {a.reviewcount} review
                                {a.reviewcount === 1 ? "" : "s"})
                              </p>
                            )}

                            {/* view reviews */}
                            <button
                              type="button"
                              className="attractionReviewsToggle"
                              onClick={() => toggleViewReviews(a)}
                            >
                              {reviewsState.atrid === a.atrid &&
                              reviewsState.expanded
                                ? "Hide reviews"
                                : `View reviews${
                                    a.reviewcount
                                      ? ` (${a.reviewcount})`
                                      : ""
                                  }`}
                            </button>

                            {reviewsState.atrid === a.atrid &&
                              reviewsState.expanded && (
                                <div className="attractionReviewsPanel">
                                  {reviewsState.loading && (
                                    <div className="attractionReviewsLoading">
                                      Loading reviews…
                                    </div>
                                  )}

                                  {reviewsState.error && (
                                    <div className="attractionReviewsError">
                                      {reviewsState.error}
                                    </div>
                                  )}

                                  {!reviewsState.loading &&
                                    !reviewsState.error &&
                                    reviewsState.items.length === 0 && (
                                      <div className="attractionReviewsEmpty">
                                        No written comments yet. Be the first!
                                      </div>
                                    )}

                                  {!reviewsState.loading &&
                                    !reviewsState.error &&
                                    reviewsState.items.length > 0 && (
                                      <ul className="attractionReviewsList">
                                        {reviewsState.items.map((r) => (
                                          <li
                                            key={
                                              r.reviewid ||
                                              `${r.username}-${r.created_at}`
                                            }
                                            className="attractionReviewsItem"
                                          >
                                            <div className="attractionReviewsHeader">
                                              <span className="attractionReviewsUser">
                                                {r.username || "Anonymous"}
                                              </span>
                                              <span className="attractionReviewsStars">
                                                {"★".repeat(r.rating || 0)}
                                                {"☆".repeat(
                                                  5 - (r.rating || 0)
                                                )}
                                              </span>
                                            </div>

                                            {r.review && (
                                              <p className="attractionReviewsText">
                                                {r.review}
                                              </p>
                                            )}

                                            {r.created_at && (
                                              <span className="attractionReviewsDate">
                                                {new Date(
                                                  r.created_at
                                                ).toLocaleDateString()}
                                              </span>
                                            )}
                                          </li>
                                        ))}
                                      </ul>
                                    )}
                                </div>
                              )}

                            {/* review trigger */}
                            <button
                              type="button"
                              className="attractionReviewTrigger"
                              onClick={() => openReviewForm(a)}
                            >
                              <span className="star">★</span>
                              <span>Rate / review this place</span>
                            </button>

                            {/* Website + map links */}
                            <div
                              style={{
                                marginTop: 6,
                                display: "flex",
                                gap: 8,
                                flexWrap: "wrap",
                              }}
                            >
                              {a.atrwebsite && (
                                <a
                                  href={a.atrwebsite}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{
                                    fontSize: 12,
                                    color: "#0066cc",
                                  }}
                                >
                                  🌐 Website
                                </a>
                              )}
                              {a.atrmaplocation && (
                                <a
                                  href={a.atrmaplocation}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{
                                    fontSize: 12,
                                    color: "#0066cc",
                                  }}
                                >
                                  🗺 Open in Maps
                                </a>
                              )}
                            </div>

                            {/* inline review form */}
                            {reviewForm.atrid === a.atrid && (
                              <form
                                className="attractionReviewForm"
                                onSubmit={handleSubmitReview}
                              >
                                <div className="attractionReviewForm-header">
                                  <span>Your review</span>
                                </div>

                                <div className="attractionReviewForm-ratingRow">
                                  <span className="attractionReviewForm-ratingLabel">
                                    Rating:
                                  </span>
                                  <select
                                    value={reviewForm.rating}
                                    onChange={(e) =>
                                      setReviewForm((prev) => ({
                                        ...prev,
                                        rating: e.target.value,
                                      }))
                                    }
                                    disabled={reviewForm.loading}
                                  >
                                    <option value={5}>★★★★★ (5)</option>
                                    <option value={4}>★★★★☆ (4)</option>
                                    <option value={3}>★★★☆☆ (3)</option>
                                    <option value={2}>★★☆☆☆ (2)</option>
                                    <option value={1}>★☆☆☆☆ (1)</option>
                                  </select>
                                </div>

                                <textarea
                                  placeholder="Share a short comment (optional)"
                                  value={reviewForm.comment}
                                  onChange={(e) =>
                                    setReviewForm((prev) => ({
                                      ...prev,
                                      comment: e.target.value,
                                    }))
                                  }
                                  disabled={reviewForm.loading}
                                />

                                {reviewForm.error && (
                                  <div className="attractionReviewForm-error">
                                    {reviewForm.error}
                                  </div>
                                )}

                                <div className="attractionReviewForm-actions">
                                  <button
                                    type="button"
                                    className="btnGhost"
                                    disabled={reviewForm.loading}
                                    onClick={() =>
                                      setReviewForm({
                                        atrid: null,
                                        rating: 5,
                                        comment: "",
                                        loading: false,
                                        error: "",
                                      })
                                    }
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="submit"
                                    className="btnPrimary"
                                    disabled={reviewForm.loading}
                                  >
                                    {reviewForm.loading
                                      ? "Saving…"
                                      : "Submit review"}
                                  </button>
                                </div>
                              </form>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
              </div>
            </>
          ) : (
            // empty state
            <ExplorePanel
                nearestStationFromUser={nearestStationFromUser}
                requestUserLocation={requestUserLocation}
                isLocLoading={isLocLoading}
                locError={locError}
                onStationClick={onStationClick}
                allStations={allStations}
                onAttractionSearchResults={onAttractionSearchResults}
                onToggleAttractionMarkers={onToggleAttractionMarkers}
                onFitAttractions={onFitAttractions} 
                onHighlightAttraction={onHighlightAttraction} 
            />
          )}
        </div>
      </div>

      {/* modal for add-attraction */}
      {showAddAttractionForm && selectedStation && (
        <div className="addAttractionOverlay">
          <div className="addAttractionModal">
            <div className="modalHeader">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h3>Suggest an attraction</h3>
                  <p>
                    Near <strong>{selectedStation.stationName}</strong>
                  </p>
                </div>

                {selectedSuggestion && (
                  <button
                    type="button"
                    onClick={resetAddAttractionForm}
                    style={{
                      padding: "4px 8px",
                      fontSize: "11px",
                      background: "#fef2f2",
                      color: "#b91c1c",
                      border: "1px solid #fecaca",
                      borderRadius: "6px",
                      cursor: "pointer",
                    }}
                  >
                    Clear Auto-fill
                  </button>
                )}
              </div>

              <button className="modalClose" onClick={closeAddAttractionForm}>
                ✕
              </button>
            </div>

            <form
              className="addAttractionForm"
              onSubmit={handleSubmitAddAttraction}
            >
              {selectedSuggestion && (
                <div style={{
                  padding: "6px 8px",
                  background: "#eff6ff",
                  border: "1px solid #bfdbfe",
                  borderRadius: "6px",
                  fontSize: "11px",
                  color: "#1e40af",
                  marginBottom: "12px"
                }}>
                  🎯 Form auto-filled from existing attraction: <strong>{selectedSuggestion.atrname}</strong><br/>
                  <span style={{fontSize: "10px", color: "#64748b"}}>
                    Edit any field if needed, then add station-specific info below.
                  </span>
                </div>
              )}
              <div className="formRow">
                <label>Name</label>
                <div className="form-field-wrapper">
                  <input
                    type="text"
                    required
                    value={addAttractionForm.name}
                    onChange={handleNameChange}
                    placeholder="Attraction Name"
                  />
                  {showSuggestions && searchResults.length > 0 && (
                    <div className="suggestions-dropdown">
                      <div className="suggestions-header">
                        🎯 Similar attractions found:
                      </div>
                      {searchResults.map((attraction, index) => (
                        <div
                          key={attraction.atrid}
                          className="suggestion-item"
                          onClick={() => autofillFromSuggestion(attraction)}
                        >
                          <div className="suggestion-name">
                            {attraction.atrname}
                          </div>
                          <div className="suggestion-meta">
                            {attraction.atrcategory && (
                              <span className="suggestion-category">
                                {attraction.atrcategory}
                              </span>
                            )}
                            {attraction.averagerating > 0 && (
                              <span className="suggestion-rating">
                                ⭐ {Number(attraction.averagerating || 0).toFixed(1)}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                      {isSearching && (
                        <div className="suggestion-loading">
                          Searching...
                        </div>
                      )}
                    </div>
                  )}

                  {!isSearching && addAttractionForm.name.trim().length >= 2 && searchResults.length === 0 && (
                    <div className="no-suggestions-inline">
                      No similar attractions found
                    </div>
                  )}
                </div>
              </div>

              <div className="formRow">
                <label>Category</label>
                <select
                  value={addAttractionForm.category}
                  onChange={(e) =>
                    setAddAttractionForm((prev) => ({
                      ...prev,
                      category: e.target.value,
                    }))
                  }
                >
                  <option value="">Select category</option>
                  {ATTRACTION_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="formRow">
                <label>Address</label>
                <input
                  type="text"
                  value={addAttractionForm.address}
                  onChange={(e) =>
                    setAddAttractionForm({
                      ...addAttractionForm,
                      address: e.target.value,
                    })
                  }
                  placeholder="Full address"
                  className={selectedSuggestion?.atraddress ? "autofilled" : ""}
                />
              </div>

              <div className="formRow">
                <label>Website</label>
                <input
                  type="url"
                  value={addAttractionForm.website}
                  onChange={(e) =>
                    setAddAttractionForm({
                      ...addAttractionForm,
                      website: e.target.value,
                    })
                  }
                  placeholder="https://..."
                  className={selectedSuggestion?.atrwebsite ? "autofilled" : ""}
                />
              </div>

              <div className="formRow">
                <label>Map link</label>
                <input
                  type="url"
                  value={addAttractionForm.mapLocation}
                  onChange={handleMapLocationChange}
                  placeholder="Google Maps link"
                />
                {(addAttractionForm.atrLatitude || addAttractionForm.atrLongitude) && (
                  <div className="coordinate-info">
                    📍 Parsed coordinates: {addAttractionForm.atrLatitude || "?"}, {addAttractionForm.atrLongitude || "?"}
                  </div>
                )}
              </div>

              <div className="formRow">
                <label>Attraction coordinates</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    type="number"
                    step="0.000001"
                    style={{ flex: 1 }}
                    value={addAttractionForm.atrLatitude}
                    onChange={(e) =>
                      setAddAttractionForm({
                        ...addAttractionForm,
                        atrLatitude: e.target.value,
                      })
                    }
                    placeholder="Latitude"
                    className={selectedSuggestion?.atrlatitude ? "autofilled" : ""}
                    required
                  />
                  <input
                    type="number"
                    step="0.000001"
                    style={{ flex: 1 }}
                    value={addAttractionForm.atrLongitude}
                    onChange={(e) =>
                      setAddAttractionForm({
                        ...addAttractionForm,
                        atrLongitude: e.target.value,
                      })
                    }
                    placeholder="Longitude"
                    className={selectedSuggestion?.atrlongitude ? "autofilled" : ""}
                    required
                  />
                </div>
              </div>
              <div className="formRow">
                <label>Opening hours (optional)</label>
                <input
                  type="text"
                  value={addAttractionForm.openingHours}
                  onChange={(e) =>
                    setAddAttractionForm({
                      ...addAttractionForm,
                      openingHours: e.target.value,
                    })
                  }
                  placeholder="E.g. Daily 10:00 AM – 10:00 PM"
                  className={selectedSuggestion?.openinghours ? "autofilled" : ""}
                />
              </div>

              <div className="formRow">
                <label>Distance & travel time from station (optional)</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    style={{ flex: 1 }}
                    value={addAttractionForm.distanceMeters}
                    onChange={(e) =>
                      handleAddAttractionChange(
                        "distanceMeters",
                        e.target.value
                      )
                    }
                    placeholder="Distance (meters)"
                  />
                  <input
                    type="number"
                    min="0"
                    step="1"
                    style={{ flex: 1 }}
                    value={addAttractionForm.travelTimeMinutes}
                    onChange={(e) =>
                      handleAddAttractionChange(
                        "travelTimeMinutes",
                        e.target.value
                      )
                    }
                    placeholder="Travel time (minutes)"
                  />
                </div>
              </div>

              <div className="formRow">
                <label>Commute option (How to get there)</label>
                <input
                  type="text"
                  value={addAttractionForm.commuteOption}
                  onChange={(e) =>
                    handleAddAttractionChange("commuteOption", e.target.value)
                  }
                  placeholder="E.g. 5-min covered walk, via link bridge"
                />
              </div>

              <div className="formRow">
                <label>Photo (optional, 1 image)</label>

                {selectedSuggestion ? (
                  <div
                    style={{
                      padding: "8px 10px",
                      borderRadius: "8px",
                      border: "1px solid #e2e8f0",
                      background: "#f8fafc",
                      fontSize: "12px",
                      color: "#475569",
                    }}
                  >
                    ✅ This attraction already exists in the system, so its photo is shared across stations.
                    <br />
                    To change the photo, use <strong>Request edit</strong>.
                  </div>
                ) : (
                  <>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                    />
                    <div style={{ fontSize: 11, color: "#6b7280", marginTop: 6 }}>
                      Tip: keep the photo small (compressed) to avoid upload errors.
                    </div>
                    {photoPreview && (
                      <div className="photoPreview">
                        <img src={photoPreview} alt="Preview" />
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Missing-fields prompt (recommended fields only) */}
              {showMissingPrompt && (
                <div
                  style={{
                    marginTop: 10,
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid #fde68a",
                    background: "#fffbeb",
                    color: "#92400e",
                    fontSize: 12,
                  }}
                >
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>
                    ⚠️ Some recommended details are empty
                  </div>

                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {missingFields.map((m) => (
                      <li key={m.label}>{m.label}</li>
                    ))}
                  </ul>

                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      marginTop: 10,
                      justifyContent: "flex-end",
                    }}
                  >
                    <button
                      type="button"
                      className="btnSecondary"
                      onClick={() => {
                        setShowMissingPrompt(false);
                        setMissingFields([]);
                      }}
                    >
                      Go back & fill
                    </button>

                    <button
                      type="button"
                      className="btnPrimary"
                      onClick={() => {
                        setShowMissingPrompt(false);
                        setMissingFields([]);
                        setSkipMissingPromptOnce(true);
                        // re-trigger submit
                        const fakeEvent = { preventDefault: () => {} };
                        handleSubmitAddAttraction(fakeEvent);
                      }}
                    >
                      Submit anyway
                    </button>
                  </div>
                </div>
              )}

              {!showMissingPrompt && (
                <div className="formActions">
                  <button
                    type="button"
                    className="btnSecondary"
                    onClick={closeAddAttractionForm}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btnPrimary">
                    Send suggestion
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* modal for EDIT REQUEST */}
      {showEditRequestModal && activeAttractionForAction && (
        <div className="addAttractionOverlay">
          <div className="addAttractionModal">
            <div className="modalHeader">
              <div>
                <h3>Request edit</h3>
                <p>
                  Editing request for{" "}
                  <strong>{activeAttractionForAction?.atrname}</strong> near{" "}
                  <strong>{selectedStation?.stationName}</strong>
                </p>
              </div>

              <button className="modalClose" onClick={closeEditRequestModal}>
                ✕
              </button>
            </div>

            <form
              className="addAttractionForm"
              onSubmit={handleSubmitEditRequest}
            >
              <div className="formRow">
                <label>Name</label>
                <input
                  type="text"
                  required
                  value={editRequestForm.name}
                  onChange={(e) =>
                    setEditRequestForm((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  placeholder="Attraction Name"
                />
              </div>

              <div className="formRow">
                <label>Category</label>
                <select
                  value={editRequestForm.category}
                  onChange={(e) =>
                    setEditRequestForm((prev) => ({
                      ...prev,
                      category: e.target.value,
                    }))
                  }
                >
                  <option value="">Select category</option>
                  {ATTRACTION_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="formRow">
                <label>Address</label>
                <input
                  type="text"
                  value={editRequestForm.address}
                  onChange={(e) =>
                    setEditRequestForm((prev) => ({
                      ...prev,
                      address: e.target.value,
                    }))
                  }
                  placeholder="Full address"
                />
              </div>

              <div className="formRow">
                <label>Website</label>
                <input
                  type="url"
                  value={editRequestForm.website}
                  onChange={(e) =>
                    setEditRequestForm((prev) => ({
                      ...prev,
                      website: e.target.value,
                    }))
                  }
                  placeholder="https://..."
                />
              </div>

              <div className="formRow">
                <label>Map link</label>
                <input
                  type="url"
                  value={editRequestForm.mapLocation}
                  onChange={(e) =>
                    setEditRequestForm((prev) => ({
                      ...prev,
                      mapLocation: e.target.value,
                    }))
                  }
                  placeholder="Google Maps link"
                />
              </div>

              <div className="formRow">
                <label>Attraction coordinates</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    type="number"
                    step="0.000001"
                    style={{ flex: 1 }}
                    value={editRequestForm.atrLatitude}
                    onChange={(e) =>
                      setEditRequestForm((prev) => ({
                        ...prev,
                        atrLatitude: e.target.value,
                      }))
                    }
                    placeholder="Latitude"
                    required
                  />
                  <input
                    type="number"
                    step="0.000001"
                    style={{ flex: 1 }}
                    value={editRequestForm.atrLongitude}
                    onChange={(e) =>
                      setEditRequestForm((prev) => ({
                        ...prev,
                        atrLongitude: e.target.value,
                      }))
                    }
                    placeholder="Longitude"
                    required
                  />
                </div>
              </div>

              <div className="formRow">
                <label>Opening hours</label>
                <input
                  type="text"
                  value={editRequestForm.openingHours}
                  onChange={(e) =>
                    setEditRequestForm((prev) => ({
                      ...prev,
                      openingHours: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="formRow">
                <label>Photo (optional, 1 image)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setEditPhotoFile(file);
                    setEditPhotoPreview(file ? URL.createObjectURL(file) : null);
                  }}
                />
                <div style={{ fontSize: 11, color: "#6b7280", marginTop: 6 }}>
                  Tip: keep the photo small (compressed) to avoid upload errors.
                </div>
                {editPhotoPreview && (
                  <div className="photoPreview">
                    <img src={editPhotoPreview} alt="Preview" />
                  </div>
                )}
              </div>

              <div className="formRow">
                <label>Distance & travel time from station</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    style={{ flex: 1 }}
                    value={editRequestForm.distanceMeters}
                    onChange={(e) =>
                      setEditRequestForm((prev) => ({
                        ...prev,
                        distanceMeters: e.target.value,
                      }))
                    }
                    placeholder="Distance (meters)"
                  />
                  <input
                    type="number"
                    min="0"
                    step="1"
                    style={{ flex: 1 }}
                    value={editRequestForm.travelTimeMinutes}
                    onChange={(e) =>
                      setEditRequestForm((prev) => ({
                        ...prev,
                        travelTimeMinutes: e.target.value,
                      }))
                    }
                    placeholder="Travel time (minutes)"
                  />
                </div>
              </div>

              <div className="formRow">
                <label>How to get there</label>
                <input
                  type="text"
                  value={editRequestForm.commuteOption}
                  onChange={(e) =>
                    setEditRequestForm((prev) => ({
                      ...prev,
                      commuteOption: e.target.value,
                    }))
                  }
                  placeholder="E.g. 5-min covered walk, via link bridge"
                />
              </div>

              <div className="formActions">
                <button
                  type="button"
                  className="btnSecondary"
                  onClick={closeEditRequestModal}
                >
                  Cancel
                </button>
                <button type="submit" className="btnPrimary">
                  Send edit request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* modal for DELETE REQUEST */}
      {showDeleteRequestModal && activeAttractionForAction && (
        <div className="addAttractionOverlay">
          <div className="addAttractionModal">
            <div className="modalHeader">
              <div>
                <h3>Request deletion</h3>
                <p>
                  For <strong>{activeAttractionForAction.atrname}</strong>
                </p>
              </div>
              <button className="modalClose" onClick={closeDeleteRequestModal}>
                ✕
              </button>
            </div>

            <form
              className="addAttractionForm"
              onSubmit={handleSubmitDeleteRequest}
            >
              <div className="formRow">
                <label>Why should this place be removed?</label>
                <textarea
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  placeholder="E.g. permanently closed, wrong place, duplicate entry…"
                  style={{ minHeight: 100 }}
                  required
                />
              </div>

              <div className="formActions">
                <button
                  type="button"
                  className="btnSecondary"
                  onClick={closeDeleteRequestModal}
                >
                  Cancel
                </button>
                <button type="submit" className="btnPrimary">
                  Send delete request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
