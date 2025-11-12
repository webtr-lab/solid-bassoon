import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import logger from '../../utils/logger';

function ReportsManagement() {
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [areaFilter, setAreaFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (start) params.set('start', start);
      if (end) params.set('end', end);
      if (areaFilter) params.set('area', areaFilter);
      const response = await fetch(`/api/reports/visits?${params.toString()}`, { credentials: 'include' });
      if (!response.ok) {
        const data = await response.json();
        alert(data.error || 'Failed to fetch report');
      } else {
        const data = await response.json();
        setResults(data.results || []);
      }
    } catch (err) {
      logger.error('Error fetching reports', err);
      alert('Error fetching reports');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (results.length === 0) {
      alert('No data to export. Please run the report first.');
      return;
    }
    const headers = ['Place Name', 'Address', 'Area', 'Visits', 'Last Visited'];
    const rows = results.map(r => [r.name, r.address || 'N/A', r.area || 'N/A', r.visits, r.last_visited ? new Date(r.last_visited).toLocaleString() : 'N/A']);
    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    const startDate = start ? new Date(start).toISOString().slice(0, 10) : 'start';
    const endDate = end ? new Date(end).toISOString().slice(0, 10) : 'end';
    const filename = `visits_report_${startDate}_to_${endDate}.csv`;
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    if (!start && !end) {
      const now = new Date();
      const past = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      setStart(past.toISOString().slice(0, 19));
      setEnd(now.toISOString().slice(0, 19));
    }
  }, []);

  return (
    <div className="max-w-6xl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-4">Visits Report</h2>
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date/Time</label>
              <input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date/Time</label>
              <input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Area</label>
              <input type="text" value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)} placeholder="Enter area..." className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            </div>
            <div className="flex items-end">
              <button onClick={fetchReports} className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium" disabled={loading}>
                {loading ? 'Loading...' : 'Run Report'}
              </button>
            </div>
          </div>
        </div>

        {results.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-medium text-blue-900">Report Summary</h3>
              <button onClick={exportToCSV} className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium text-sm">Export to CSV</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-700">{results.length}</div>
                <div className="text-sm text-blue-600">Locations Visited</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-700">{results.reduce((sum, r) => sum + r.visits, 0)}</div>
                <div className="text-sm text-blue-600">Total Visits</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-700">N/A</div>
                <div className="text-sm text-blue-600">Unique Vehicles</div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Place</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Address</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Visits</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Visited</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {results.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                  {loading ? 'Loading...' : 'No results. Run the report to see visits.'}
                </td>
              </tr>
            )}
            {results.map((r) => (
              <tr key={r.place_id}>
                <td className="px-6 py-4 whitespace-nowrap font-medium">{r.name}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{r.address || 'N/A'}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-blue-600">{r.visits}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                  {r.last_visited ? new Date(r.last_visited).toLocaleString() : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

ReportsManagement.propTypes = {};
export default ReportsManagement;
