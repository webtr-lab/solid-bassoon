import React, { useState, useEffect } from 'react';
import { apiFetch, getErrorMessage } from '../utils/apiClient';
import logger from '../utils/logger';

function VisitsReport() {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [areaFilter, setAreaFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [report, setReport] = useState(null);
  const [expandedLocations, setExpandedLocations] = useState(new Set());

  const fetchReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        start: `${startDate}T00:00:00`,
        end: `${endDate}T23:59:59`,
        ...(areaFilter && { area: areaFilter })
      });

      const data = await apiFetch(`/api/reports/visits-detailed?${params}`);
      setReport(data);
    } catch (err) {
      logger.error('Error fetching visits report:', err);
      setError(getErrorMessage(err, 'Failed to load visits report'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  const toggleLocation = (locationIndex) => {
    const newExpanded = new Set(expandedLocations);
    if (newExpanded.has(locationIndex)) {
      newExpanded.delete(locationIndex);
    } else {
      newExpanded.add(locationIndex);
    }
    setExpandedLocations(newExpanded);
  };

  const exportToCSV = () => {
    if (!report) return;

    // CSV header
    const headers = ['Location Name', 'Area', 'Latitude', 'Longitude', 'Visit Count', 'Vehicle Name', 'Timestamp', 'Notes'];
    const rows = [];

    // Add data rows
    report.locations.forEach((location) => {
      if (location.visits.length === 0) {
        // Location with no visits
        rows.push([
          location.name,
          location.area || '',
          location.latitude.toFixed(4),
          location.longitude.toFixed(4),
          location.visit_count,
          '',
          '',
          ''
        ]);
      } else {
        // Add a row for each visit
        location.visits.forEach((visit, idx) => {
          rows.push([
            idx === 0 ? location.name : '', // Only show location name on first visit
            idx === 0 ? (location.area || '') : '',
            idx === 0 ? location.latitude.toFixed(4) : '',
            idx === 0 ? location.longitude.toFixed(4) : '',
            idx === 0 ? location.visit_count : '',
            visit.vehicle_name,
            new Date(visit.timestamp).toLocaleString(),
            visit.notes || ''
          ]);
        });
      }
    });

    // Escape CSV values and join
    const csvContent = [
      headers.map(h => `"${h}"`).join(','),
      ...rows.map(row =>
        row.map(cell => {
          const str = String(cell);
          // Escape quotes and wrap in quotes if contains comma, quote, or newline
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return `"${str}"`;
        }).join(',')
      )
    ].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    const fileName = `visits-report-${startDate}_to_${endDate}.csv`;
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-6">Visits Report</h2>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Area Filter (Optional)</label>
          <input
            type="text"
            value={areaFilter}
            onChange={(e) => setAreaFilter(e.target.value)}
            placeholder="e.g., Centrum, Maretraite"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-end">
          <button
            onClick={fetchReport}
            disabled={loading}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Generate Report'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {report && (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Total Locations</div>
              <div className="text-2xl font-bold text-blue-600">{report.total_locations}</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Total Visits</div>
              <div className="text-2xl font-bold text-green-600">{report.total_visits}</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Period</div>
              <div className="text-sm font-semibold text-purple-600">
                {new Date(report.start).toLocaleDateString()} - {new Date(report.end).toLocaleDateString()}
              </div>
            </div>
          </div>

          {/* Export Button */}
          <div className="mb-6 flex justify-end">
            <button
              onClick={exportToCSV}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
            >
              📥 Export to CSV
            </button>
          </div>

          {/* Locations List */}
          <div className="space-y-2">
            {report.locations.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No visits found for the selected period
              </div>
            ) : (
              report.locations.map((location, idx) => (
                <div key={idx} className="border border-gray-200 rounded-lg overflow-hidden">
                  {/* Location Header */}
                  <button
                    onClick={() => toggleLocation(idx)}
                    className="w-full text-left p-4 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between"
                  >
                    <div className="flex-1">
                      <div className="font-semibold text-lg">{location.name}</div>
                      {location.area && (
                        <div className="text-sm text-gray-600 mt-1">Area: {location.area}</div>
                      )}
                      <div className="text-xs text-gray-500 mt-1">
                        {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-2xl font-bold text-blue-600">{location.visit_count}</div>
                        <div className="text-xs text-gray-600">visits</div>
                      </div>
                      <div className="text-gray-400 text-xl">
                        {expandedLocations.has(idx) ? '▼' : '▶'}
                      </div>
                    </div>
                  </button>

                  {/* Expanded Details */}
                  {expandedLocations.has(idx) && (
                    <div className="bg-white border-t border-gray-200 p-4">
                      <div className="space-y-3">
                        <div className="font-semibold text-sm text-gray-700 mb-3">Vehicle Visits:</div>
                        {location.visits.map((visit, vIdx) => (
                          <div key={vIdx} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="font-medium text-gray-800">{visit.vehicle_name}</div>
                                <div className="text-sm text-gray-600 mt-1">
                                  {new Date(visit.timestamp).toLocaleString()}
                                </div>
                                {visit.notes && (
                                  <div className="text-xs text-gray-500 italic mt-1 p-2 bg-white rounded border border-gray-200">
                                    {visit.notes}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default VisitsReport;
