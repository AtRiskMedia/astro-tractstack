import { useState, useMemo, useCallback } from 'react';
import { useStore } from '@nanostores/react';
import { brandConfigStore } from '@/stores/brand';
import { saveResourceWithStateUpdate } from '@/utils/api/resourceConfig';
import type { FullContentMapItem } from '@/types/tractstack';

interface ResourceBulkIngestProps {
  onClose: (saved: boolean) => void;
  onRefresh: () => void;
}

interface ParsedResource {
  title: string;
  slug: string;
  categorySlug: string;
  oneliner?: string;
  optionsPayload: Record<string, any>;
  actionLisp?: string;
}

interface ValidationError {
  index: number;
  field: string;
  message: string;
}

interface ValidationResult {
  status: 'no-data' | 'invalid' | 'valid';
  resources: ParsedResource[];
  errors: ValidationError[];
  validResources: ParsedResource[];
}

interface FieldDefinition {
  type: string;
  optional: boolean;
  defaultValue?: any;
  belongsToCategory?: string;
  minNumber?: number;
  maxNumber?: number;
}

export default function ResourceBulkIngest({
  onClose,
  onRefresh,
}: ResourceBulkIngestProps) {
  const [jsonInput, setJsonInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const brandConfig = useStore(brandConfigStore);
  const knownResources = brandConfig?.KNOWN_RESOURCES || {};

  const validationResult = useMemo((): ValidationResult => {
    if (!jsonInput.trim()) {
      return {
        status: 'no-data',
        resources: [],
        errors: [],
        validResources: [],
      };
    }

    let parsed: any[];
    try {
      parsed = JSON.parse(jsonInput);
    } catch {
      return {
        status: 'invalid',
        resources: [],
        errors: [{ index: -1, field: 'json', message: 'Invalid JSON format' }],
        validResources: [],
      };
    }

    if (!Array.isArray(parsed)) {
      return {
        status: 'invalid',
        resources: [],
        errors: [
          {
            index: -1,
            field: 'root',
            message: 'Input must be an array of objects',
          },
        ],
        validResources: [],
      };
    }

    const errors: ValidationError[] = [];
    const validResources: ParsedResource[] = [];
    const slugs = new Set<string>();

    parsed.forEach((item, index) => {
      if (!item || typeof item !== 'object') {
        errors.push({ index, field: 'root', message: 'Must be an object' });
        return;
      }

      // Core field validation
      if (!item.title || typeof item.title !== 'string') {
        errors.push({
          index,
          field: 'title',
          message: 'Title is required and must be a string',
        });
      }

      if (!item.slug || typeof item.slug !== 'string') {
        errors.push({
          index,
          field: 'slug',
          message: 'Slug is required and must be a string',
        });
      } else {
        if (!/^[a-z0-9-]+$/.test(item.slug)) {
          errors.push({
            index,
            field: 'slug',
            message: `Slug "${item.slug}" must be lowercase alphanumeric and hyphens only`,
          });
        }
        if (slugs.has(item.slug)) {
          errors.push({
            index,
            field: 'slug',
            message: `Duplicate slug "${item.slug}" found in batch`,
          });
        } else {
          slugs.add(item.slug);
        }
      }

      // Handle both "category" and "categorySlug" for user convenience
      const categorySlug = item.categorySlug || item.category;
      if (!categorySlug || typeof categorySlug !== 'string') {
        errors.push({
          index,
          field: 'category',
          message: 'Category is required and must be a string',
        });
      } else {
        if (!knownResources[categorySlug]) {
          errors.push({
            index,
            field: 'category',
            message: `Category '${categorySlug}' is not defined in known resources`,
          });
        }
      }

      if (item.oneliner !== undefined && typeof item.oneliner !== 'string') {
        errors.push({
          index,
          field: 'oneliner',
          message: 'Oneliner must be a string',
        });
      }

      // Extract optionsPayload - exclude both category and categorySlug
      const {
        title,
        slug,
        categorySlug: itemCategorySlug,
        category,
        oneliner,
        actionLisp,
        ...optionsPayload
      } = item;

      // Validate against knownResources schema
      if (knownResources[categorySlug]) {
        const categorySchema = knownResources[categorySlug];

        // Check all fields defined in schema
        Object.entries(categorySchema).forEach(
          ([fieldName, fieldDef]: [string, FieldDefinition]) => {
            const value = optionsPayload[fieldName];
            const hasValue =
              value !== undefined && value !== null && value !== '';

            // Required field check
            if (!fieldDef.optional && !hasValue) {
              errors.push({
                index,
                field: fieldName,
                message: `Field '${fieldName}' is required for category '${categorySlug}'`,
              });
              return;
            }

            // Skip validation if optional and not provided
            if (!hasValue) return;

            // Type validation based on FieldDefinition.Type
            switch (fieldDef.type) {
              case 'string':
                if (typeof value !== 'string') {
                  errors.push({
                    index,
                    field: fieldName,
                    message: `${fieldName} must be a string`,
                  });
                }
                break;

              case 'number':
                if (typeof value !== 'number') {
                  errors.push({
                    index,
                    field: fieldName,
                    message: `${fieldName} must be a number`,
                  });
                } else {
                  if (
                    fieldDef.minNumber !== undefined &&
                    value < fieldDef.minNumber
                  ) {
                    errors.push({
                      index,
                      field: fieldName,
                      message: `${fieldName} must be at least ${fieldDef.minNumber}`,
                    });
                  }
                  if (
                    fieldDef.maxNumber !== undefined &&
                    value > fieldDef.maxNumber
                  ) {
                    errors.push({
                      index,
                      field: fieldName,
                      message: `${fieldName} must be at most ${fieldDef.maxNumber}`,
                    });
                  }
                }
                break;

              case 'boolean':
                if (typeof value !== 'boolean') {
                  errors.push({
                    index,
                    field: fieldName,
                    message: `${fieldName} must be a boolean`,
                  });
                }
                break;

              case 'multi':
                if (!Array.isArray(value)) {
                  errors.push({
                    index,
                    field: fieldName,
                    message: `${fieldName} must be an array`,
                  });
                } else {
                  if (!fieldDef.optional && value.length === 0) {
                    errors.push({
                      index,
                      field: fieldName,
                      message: `${fieldName} must have at least one value`,
                    });
                  }
                  value.forEach((str, i) => {
                    if (typeof str !== 'string') {
                      errors.push({
                        index,
                        field: fieldName,
                        message: `${fieldName}[${i}] must be a string`,
                      });
                    }
                  });
                }
                break;

              case 'date':
                // Accept ISO string or timestamp
                if (typeof value === 'string') {
                  const date = new Date(value);
                  if (isNaN(date.getTime())) {
                    errors.push({
                      index,
                      field: fieldName,
                      message: `${fieldName} must be a valid date`,
                    });
                  }
                } else if (typeof value === 'number') {
                  const date = new Date(value * 1000);
                  if (isNaN(date.getTime())) {
                    errors.push({
                      index,
                      field: fieldName,
                      message: `${fieldName} must be a valid timestamp`,
                    });
                  }
                } else {
                  errors.push({
                    index,
                    field: fieldName,
                    message: `${fieldName} must be a date string or timestamp`,
                  });
                }
                break;

              case 'image':
                if (typeof value !== 'string') {
                  errors.push({
                    index,
                    field: fieldName,
                    message: `${fieldName} must be a string (file ID)`,
                  });
                }
                break;

              default:
                errors.push({
                  index,
                  field: fieldName,
                  message: `Unknown field type '${fieldDef.type}' for ${fieldName}`,
                });
            }
          }
        );

        // Check for unknown fields
        Object.keys(optionsPayload).forEach((key) => {
          if (!(key in categorySchema)) {
            errors.push({
              index,
              field: key,
              message: `Unknown field: ${key}`,
            });
          }
        });
      }

      // If no errors for this specific resource, add to valid list
      const resourceErrors = errors.filter((e) => e.index === index);
      if (resourceErrors.length === 0 && item.title && item.slug && categorySlug) {
        // Process dates to timestamps if needed
        const processedOptionsPayload = { ...optionsPayload };
        if (knownResources[categorySlug]) {
          Object.entries(processedOptionsPayload).forEach(([key, value]) => {
            const fieldDef = knownResources[categorySlug][key];
            if (fieldDef?.type === 'date' && typeof value === 'string') {
              processedOptionsPayload[key] = Math.floor(
                new Date(value).getTime() / 1000
              );
            }
          });
        }

        validResources.push({
          title: item.title.trim(),
          slug: item.slug,
          categorySlug: categorySlug,
          oneliner: item.oneliner?.trim() || '',
          optionsPayload: processedOptionsPayload,
          actionLisp: item.actionLisp || '',
        });
      }
    });

    // Allow proceeding if we have valid resources, even if some have errors
    const status = validResources.length > 0 ? 'valid' : errors.length > 0 ? 'invalid' : 'no-data';

    return {
      status,
      resources: parsed,
      errors,
      validResources,
    };
  }, [jsonInput, knownResources]);

  // Generate example JSON based on available categories
  const exampleJson = useMemo(() => {
    const categories = Object.keys(knownResources);
    if (categories.length === 0) {
      return JSON.stringify(
        [
          {
            title: 'Example Resource',
            slug: 'example-resource',
            category: 'example-category',
            oneliner: 'A brief description',
          },
        ],
        null,
        2
      );
    }

    const firstCategory = categories[0];
    const schema = knownResources[firstCategory];
    const example: any = {
      title: 'Example Resource',
      slug: `${firstCategory}-example`,
      category: firstCategory,
      oneliner: 'A brief description',
    };

    // Add example values for schema fields
    Object.entries(schema).forEach(([key, def]: [string, FieldDefinition]) => {
      switch (def.type) {
        case 'string':
          example[key] = def.defaultValue || 'example text';
          break;
        case 'number':
          example[key] = def.defaultValue || 0;
          break;
        case 'boolean':
          example[key] =
            def.defaultValue !== undefined ? def.defaultValue : true;
          break;
        case 'multi':
          example[key] = def.defaultValue || ['example1', 'example2'];
          break;
        case 'date':
          example[key] = new Date().toISOString();
          break;
        case 'image':
          example[key] = 'file-id-here';
          break;
      }
    });

    return JSON.stringify([example], null, 2);
  }, [knownResources]);

  // Handle bulk save
  const handleSave = useCallback(async () => {
    if (validationResult.validResources.length === 0 || isProcessing) return;

    setIsProcessing(true);
    setProgress({ current: 0, total: validationResult.validResources.length });

    try {
      for (let i = 0; i < validationResult.validResources.length; i++) {
        const resource = validationResult.validResources[i];
        setProgress({
          current: i,
          total: validationResult.validResources.length,
        });

        const resourceState = {
          id: '',
          title: resource.title,
          slug: resource.slug,
          categorySlug: resource.categorySlug,
          oneliner: resource.oneliner || '',
          optionsPayload: resource.optionsPayload,
          actionLisp: resource.actionLisp,
        };

        await saveResourceWithStateUpdate(resourceState, resourceState);

        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      setProgress({
        current: validationResult.validResources.length,
        total: validationResult.validResources.length,
      });

      setTimeout(() => {
        onRefresh();
        onClose(true);
      }, 1000);
    } catch (error) {
      console.error('Bulk save failed:', error);
      alert(
        `Save failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      setIsProcessing(false);
    }
  }, [validationResult.validResources, isProcessing, onRefresh, onClose]);

  const canSave =
    validationResult.status === 'valid' &&
    validationResult.validResources.length > 0 &&
    !isProcessing;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div
          className="fixed inset-0 bg-black opacity-25"
          onClick={() => onClose(false)}
        />

        <div className="relative w-full max-w-4xl rounded-lg bg-white shadow-xl">
          <div className="p-6">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-gray-900">
                Bulk Import Resources
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                Import multiple resources from JSON. Each resource will be
                validated against its category schema from knownResources.
              </p>
            </div>

            <div className="mb-4">
              <label
                htmlFor="json-input"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                JSON Data
              </label>
              <textarea
                id="json-input"
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                rows={12}
                className="w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm focus:border-cyan-500 focus:ring-cyan-500"
                placeholder={exampleJson}
                disabled={isProcessing}
              />
            </div>

            {/* Status Display */}
            <div className="mb-6 rounded-md border border-gray-200 bg-gray-50 p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-medium text-gray-900">
                  {validationResult.resources.length} resources found
                </span>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${validationResult.status === 'valid'
                      ? 'bg-green-100 text-green-800'
                      : validationResult.status === 'invalid'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                >
                  {validationResult.status === 'valid' && 'Ready to import'}
                  {validationResult.status === 'invalid' && 'Has errors'}
                  {validationResult.status === 'no-data' && 'No data'}
                </span>
              </div>

              {validationResult.status === 'valid' && validationResult.errors.length === 0 && (
                <p className="text-sm text-green-700">
                  All {validationResult.validResources.length} resources are
                  valid and ready to import.
                </p>
              )}

              {validationResult.status === 'valid' && validationResult.errors.length > 0 && (
                <p className="text-sm text-green-700">
                  {validationResult.validResources.length} valid resources ready to import.
                  {validationResult.errors.length} resources have errors and will be skipped.
                </p>
              )}

              {validationResult.errors.length > 0 && (
                <div className="mt-2">
                  <p className="mb-2 text-sm font-medium text-red-700">
                    Validation Errors:
                  </p>
                  <div className="max-h-32 overflow-y-auto">
                    <ul className="space-y-1 text-sm text-red-600">
                      {validationResult.errors
                        .slice(0, 10)
                        .map((error, idx) => (
                          <li key={idx} className="flex">
                            <span className="mr-2 font-medium">
                              {error.index >= 0
                                ? `Item ${error.index + 1}:`
                                : 'JSON:'}
                            </span>
                            <span>
                              {error.field} - {error.message}
                            </span>
                          </li>
                        ))}
                      {validationResult.errors.length > 10 && (
                        <li className="text-gray-500">
                          ...and {validationResult.errors.length - 10} more
                          errors
                        </li>
                      )}
                    </ul>
                  </div>
                  {validationResult.validResources.length > 0 && (
                    <p className="mt-2 text-sm text-amber-700">
                      {validationResult.validResources.length} valid resources
                      can still be imported.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Progress Bar */}
            {isProcessing && (
              <div className="mb-6">
                <div className="mb-1 flex justify-between text-sm text-gray-600">
                  <span>Importing resources...</span>
                  <span>
                    {progress.current} / {progress.total}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-200">
                  <div
                    className="h-2 rounded-full bg-cyan-600 transition-all duration-300"
                    style={{
                      width: `${(progress.current / progress.total) * 100}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => onClose(false)}
                disabled={isProcessing}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!canSave}
                className="rounded-md border border-transparent bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50"
              >
                {isProcessing
                  ? `Importing... (${progress.current}/${progress.total})`
                  : `Import ${validationResult.validResources.length} Resources`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
