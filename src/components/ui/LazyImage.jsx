import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';

/**
 * LazyImage - Performance optimized image component
 * 
 * Features:
 * - Native lazy loading with IntersectionObserver fallback
 * - Blur placeholder while loading
 * - Error handling with fallback
 * - Proper aspect ratio to prevent layout shift
 * - WCAG compliant with required alt text
 * 
 * @param {Object} props - Component props
 * @param {string} props.src - Image source URL
 * @param {string} props.alt - Alt text (required for accessibility)
 * @param {string} props.className - Additional CSS classes
 * @param {number} props.width - Image width
 * @param {number} props.height - Image height
 * @param {string} props.placeholder - Placeholder color or blur data URL
 * @param {string} props.fallback - Fallback image on error
 */
export function LazyImage({
  src,
  alt,
  className = '',
  width,
  height,
  placeholder = 'rgba(30, 30, 50, 0.6)',
  fallback = null,
  ...props
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef(null);

  // Use IntersectionObserver for lazy loading
  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;

    // Check if native lazy loading is supported
    if ('loading' in HTMLImageElement.prototype) {
      setIsInView(true);
      return;
    }

    // Fallback to IntersectionObserver
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.unobserve(entry.target);
          }
        });
      },
      {
        rootMargin: '50px 0px', // Start loading 50px before entering viewport
        threshold: 0.01,
      }
    );

    observer.observe(img);
    return () => observer.disconnect();
  }, []);

  const handleLoad = () => {
    setIsLoaded(true);
  };

  const handleError = () => {
    setHasError(true);
    if (fallback) {
      setIsLoaded(true);
    }
  };

  const imageSrc = hasError && fallback ? fallback : src;
  const aspectRatio = width && height ? width / height : undefined;

  return (
    <div
      ref={imgRef}
      className={`lazy-image-container ${className}`}
      style={{
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: placeholder,
        aspectRatio: aspectRatio,
      }}
    >
      {isInView && (
        <img
          src={imageSrc}
          alt={alt}
          width={width}
          height={height}
          loading="lazy"
          decoding="async"
          onLoad={handleLoad}
          onError={handleError}
          className={`lazy-image ${isLoaded ? 'lazy-image-loaded' : 'lazy-image-loading'}`}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: isLoaded ? 1 : 0,
            transition: 'opacity 0.3s ease-in-out',
          }}
          {...props}
        />
      )}
      
      {/* Placeholder shimmer effect */}
      {!isLoaded && (
        <div
          className="lazy-image-placeholder"
          style={{
            position: 'absolute',
            inset: 0,
            background: `linear-gradient(90deg, ${placeholder} 0%, rgba(255,255,255,0.1) 50%, ${placeholder} 100%)`,
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite',
          }}
          aria-hidden="true"
        />
      )}
    </div>
  );
}

LazyImage.propTypes = {
  src: PropTypes.string.isRequired,
  alt: PropTypes.string.isRequired,
  className: PropTypes.string,
  width: PropTypes.number,
  height: PropTypes.number,
  placeholder: PropTypes.string,
  fallback: PropTypes.string,
};

export default LazyImage;
