/**
 * Marker Icons Utility Tests
 * Tests icon creation functions and exports
 */

import { createColoredIcon, createSavedLocationIcon, createPOIIcon, vehicleColors } from '../markerIcons';

describe('markerIcons Utility', () => {
  test('exports vehicleColors array with 5 colors', () => {
    expect(vehicleColors).toBeDefined();
    expect(Array.isArray(vehicleColors)).toBe(true);
    expect(vehicleColors.length).toBe(5);
    expect(vehicleColors[0]).toBe('#3b82f6');
    expect(vehicleColors[4]).toBe('#8b5cf6');
  });

  describe('createColoredIcon', () => {
    test('returns a Leaflet DivIcon', () => {
      const icon = createColoredIcon('#3b82f6');
      expect(icon).toBeDefined();
      expect(icon.options.className).toBe('custom-div-icon');
    });

    test('creates icon with correct color in HTML', () => {
      const testColor = '#ff0000';
      const icon = createColoredIcon(testColor);
      expect(icon.options.html).toContain(`background-color: ${testColor}`);
    });

    test('has correct icon size', () => {
      const icon = createColoredIcon('#3b82f6');
      expect(icon.options.iconSize).toEqual([24, 24]);
    });

    test('has correct icon anchor', () => {
      const icon = createColoredIcon('#3b82f6');
      expect(icon.options.iconAnchor).toEqual([12, 12]);
    });

    test('includes styling for circular appearance', () => {
      const icon = createColoredIcon('#3b82f6');
      expect(icon.options.html).toContain('border-radius: 50%');
      expect(icon.options.html).toContain('border: 3px solid white');
    });

    test('works with various color formats', () => {
      const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'];
      colors.forEach(color => {
        const icon = createColoredIcon(color);
        expect(icon.options.html).toContain(`background-color: ${color}`);
      });
    });
  });

  describe('createSavedLocationIcon', () => {
    test('returns a Leaflet DivIcon', () => {
      const icon = createSavedLocationIcon();
      expect(icon).toBeDefined();
      expect(icon.options.className).toBe('custom-div-icon');
    });

    test('has yellow background color', () => {
      const icon = createSavedLocationIcon();
      expect(icon.options.html).toContain('background-color: #fbbf24');
    });

    test('has correct icon size', () => {
      const icon = createSavedLocationIcon();
      expect(icon.options.iconSize).toEqual([20, 20]);
    });

    test('has correct icon anchor', () => {
      const icon = createSavedLocationIcon();
      expect(icon.options.iconAnchor).toEqual([10, 10]);
    });

    test('is consistently formatted', () => {
      const icon1 = createSavedLocationIcon();
      const icon2 = createSavedLocationIcon();
      expect(icon1.options.html).toBe(icon2.options.html);
    });
  });

  describe('createPOIIcon', () => {
    test('returns a Leaflet DivIcon', () => {
      const icon = createPOIIcon();
      expect(icon).toBeDefined();
      expect(icon.options.className).toBe('custom-div-icon');
    });

    test('has pink background color', () => {
      const icon = createPOIIcon();
      expect(icon.options.html).toContain('background-color: #ec4899');
    });

    test('includes pin emoji', () => {
      const icon = createPOIIcon();
      expect(icon.options.html).toContain('📍');
    });

    test('has correct icon size', () => {
      const icon = createPOIIcon();
      expect(icon.options.iconSize).toEqual([28, 28]);
    });

    test('has correct icon anchor', () => {
      const icon = createPOIIcon();
      expect(icon.options.iconAnchor).toEqual([14, 14]);
    });

    test('includes flexbox styling for emoji centering', () => {
      const icon = createPOIIcon();
      expect(icon.options.html).toContain('display: flex');
      expect(icon.options.html).toContain('align-items: center');
      expect(icon.options.html).toContain('justify-content: center');
    });

    test('is consistently formatted', () => {
      const icon1 = createPOIIcon();
      const icon2 = createPOIIcon();
      expect(icon1.options.html).toBe(icon2.options.html);
    });
  });

  describe('Icon consistency', () => {
    test('all icons have box-shadow styling', () => {
      const coloredIcon = createColoredIcon('#3b82f6');
      const savedIcon = createSavedLocationIcon();
      const poiIcon = createPOIIcon();

      expect(coloredIcon.options.html).toContain('box-shadow');
      expect(savedIcon.options.html).toContain('box-shadow');
      expect(poiIcon.options.html).toContain('box-shadow');
    });

    test('all icons have white borders', () => {
      const coloredIcon = createColoredIcon('#3b82f6');
      const savedIcon = createSavedLocationIcon();
      const poiIcon = createPOIIcon();

      expect(coloredIcon.options.html).toContain('white');
      expect(savedIcon.options.html).toContain('white');
      expect(poiIcon.options.html).toContain('white');
    });

    test('all icons are circular', () => {
      const coloredIcon = createColoredIcon('#3b82f6');
      const savedIcon = createSavedLocationIcon();
      const poiIcon = createPOIIcon();

      expect(coloredIcon.options.html).toContain('border-radius: 50%');
      expect(savedIcon.options.html).toContain('border-radius: 50%');
      expect(poiIcon.options.html).toContain('border-radius: 50%');
    });
  });
});
