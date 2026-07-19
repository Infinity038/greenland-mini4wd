import { describe, expect, it } from 'vitest';
import { fixImageUrl, parseImages } from './images';

describe('fixImageUrl', () => {
  it('passes through a plain https URL unchanged', () => {
    expect(fixImageUrl('https://example.com/car.png')).toBe('https://example.com/car.png');
  });

  it('returns falsy input unchanged', () => {
    expect(fixImageUrl('')).toBe('');
  });

  it('decodes a base64 cloudinary "drilldown" segment', () => {
    const real = 'v1234567/products/car-front.png';
    const encoded = Buffer.from(real).toString('base64');
    const input = `https://res.cloudinary.com/demo/image/upload/v1234567/${encoded}/drilldown`;
    expect(fixImageUrl(input)).toBe(`https://res.cloudinary.com/demo/image/upload/v1234567/${real}`);
  });

  it('rewrites the console thumbnails host to the public delivery host', () => {
    const input = 'https://res-console.cloudinary.com/demo/thumbnails/v1/image/upload/v1234567/car.png';
    expect(fixImageUrl(input)).toBe('https://res.cloudinary.com/demo/image/upload/v1234567/car.png');
  });

  it('appends .png to an extension-less cloudinary delivery URL', () => {
    const input = 'https://res.cloudinary.com/demo/image/upload/v1234567/car-front';
    expect(fixImageUrl(input)).toBe('https://res.cloudinary.com/demo/image/upload/v1234567/car-front.png');
  });

  it('does not touch a cloudinary URL that already has an extension', () => {
    const input = 'https://res.cloudinary.com/demo/image/upload/v1234567/car-front.jpg';
    expect(fixImageUrl(input)).toBe(input);
  });
});

describe('parseImages', () => {
  it('returns an empty array for null/undefined/empty input', () => {
    expect(parseImages(null)).toEqual([]);
    expect(parseImages(undefined)).toEqual([]);
    expect(parseImages('')).toEqual([]);
  });

  it('splits a comma-separated list, trims whitespace, and fixes each URL', () => {
    const result = parseImages(' https://example.com/a.png , https://example.com/b.png ');
    expect(result).toEqual(['https://example.com/a.png', 'https://example.com/b.png']);
  });

  it('filters out empty segments from trailing/duplicate commas', () => {
    expect(parseImages('https://example.com/a.png,,')).toEqual(['https://example.com/a.png']);
  });
});
