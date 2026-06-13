import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import ChevronDownIcon from '@heroicons/react/24/outline/ChevronDownIcon';
import ChevronRightIcon from '@heroicons/react/24/outline/ChevronRightIcon';
import { salesHelpers } from '@/utils/api/salesHelpers';
import type { SaleEntity, SaleProductLine } from '@/types/tractstack';
import type { ResourceNode } from '@/types/compositorTypes';
import {
  getServiceLinkedProduct,
  isSharedFeeService,
  parsePrimaryShopifyProductData,
} from '@/custom/shopify/shopifyHelpers';

interface ShopifyDashboardSalesProps {
  existingResources: ResourceNode[];
}

const ITEMS_PER_PAGE = 10;

export default function ShopifyDashboard_Sales({
  existingResources,
}: ShopifyDashboardSalesProps) {
  const [sales, setSales] = useState<SaleEntity[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const resourceById = useMemo(() => {
    return new Map(
      existingResources.map((resource) => [resource.id, resource])
    );
  }, [existingResources]);

  const resourceBySlug = useMemo(() => {
    return new Map(
      existingResources.map((resource) => [resource.slug, resource])
    );
  }, [existingResources]);

  const fetchSales = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await salesHelpers.listSales(
        ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
      );
      setSales(response.data || []);
      setTotalCount(response.totalCount || 0);
    } catch (error) {
      console.error('Failed to fetch sales:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage]);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const toggleExpanded = (saleId: string) => {
    setExpandedRows((current) => {
      const next = new Set(current);
      if (next.has(saleId)) {
        next.delete(saleId);
      } else {
        next.add(saleId);
      }
      return next;
    });
  };

  const getStatusColor = (status: string) => {
    if (status === 'PAID') return 'bg-green-100 text-green-800';
    return 'bg-gray-100 text-gray-800';
  };

  const getTagColor = (tag: string) => {
    switch (tag) {
      case 'local-pickup':
        return 'bg-cyan-100 text-cyan-800';
      case 'orphan':
        return 'bg-red-100 text-red-800';
      case 'remote':
        return 'bg-violet-100 text-violet-800';
      case 'in-person':
        return 'bg-slate-100 text-slate-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const formatMoney = (amount: string, currencyCode?: string) => {
    const parsed = parseFloat(amount || '0');
    const safeAmount = Number.isFinite(parsed) ? parsed : 0;
    return `${safeAmount.toFixed(2)} ${currencyCode || 'USD'}`;
  };

  const formatLineTotal = (line: SaleProductLine) => {
    const parsed = parseFloat(line.price || '0');
    const safeAmount = Number.isFinite(parsed) ? parsed : 0;
    return formatMoney(
      (safeAmount * (line.quantity || 1)).toString(),
      line.currencyCode
    );
  };

  const productSummary = (sale: SaleEntity) => {
    if (sale.products.length === 0) return 'No line items';
    const first = sale.products[0];
    const suffix =
      sale.products.length > 1 ? `, +${sale.products.length - 1} more` : '';
    return `${first.title} x${first.quantity || 1}${suffix}`;
  };

  const customerLabel = (sale: SaleEntity) => {
    if (sale.leadName && sale.leadEmail) {
      return `${sale.leadName} (${sale.leadEmail})`;
    }
    return sale.leadName || sale.leadEmail || 'Guest';
  };

  const variantTitle = (line: SaleProductLine) => {
    const product = resourceById.get(line.resourceId);
    const parsed = parsePrimaryShopifyProductData(product);
    const variant = parsed?.variants?.find(
      (v: any) => v?.id === line.variantId
    );
    return variant?.title && variant.title !== 'Default Title'
      ? variant.title
      : '';
  };

  const resolveBookingServices = (sale: SaleEntity) => {
    const serviceMap = new Map<string, ResourceNode>();
    const bookingResources =
      sale.booking?.resourceIds
        ?.map((id) => resourceById.get(id))
        .filter((resource): resource is ResourceNode => Boolean(resource)) ||
      [];

    bookingResources.forEach((resource) => {
      if (
        resource.categorySlug === 'service' ||
        resource.optionsPayload?.bookingLengthMinutes
      ) {
        serviceMap.set(resource.id, resource);
      }

      const boundSlug = resource.optionsPayload?.serviceBound;
      if (typeof boundSlug === 'string' && boundSlug.trim()) {
        const boundService = resourceBySlug.get(boundSlug);
        if (boundService) {
          serviceMap.set(boundService.id, boundService);
        }
      }
    });

    return Array.from(serviceMap.values()).sort((a, b) =>
      a.title.localeCompare(b.title)
    );
  };

  const renderSharedFeeBlock = (sale: SaleEntity) => {
    if (!sale.booking) return null;
    const services = resolveBookingServices(sale);
    const sharedServices = services.filter((service) =>
      isSharedFeeService(service, existingResources)
    );
    if (sharedServices.length === 0) return null;

    const chargeLine = sale.products.find((line) => {
      const product = resourceById.get(line.resourceId);
      return product?.optionsPayload?.sharedServiceFee === true;
    });

    return (
      <div className="rounded-md border border-cyan-100 bg-cyan-50 p-3">
        <div className="text-xs font-bold uppercase text-cyan-700">
          Shared service charge
        </div>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-cyan-950">
          {sharedServices.map((service) => (
            <li key={service.id}>{service.title}</li>
          ))}
        </ul>
        {chargeLine && (
          <div className="mt-3 border-t border-cyan-200 pt-2 text-sm font-bold text-cyan-950">
            Charge: {formatLineTotal(chargeLine)}
          </div>
        )}
      </div>
    );
  };

  const renderNonSharedServices = (sale: SaleEntity) => {
    if (!sale.booking) return null;
    const services = resolveBookingServices(sale).filter(
      (service) => !isSharedFeeService(service, existingResources)
    );
    if (services.length === 0) return null;

    return (
      <div className="rounded-md border border-gray-200 bg-white p-3">
        <div className="text-xs font-bold uppercase text-gray-500">
          Service charges
        </div>
        <div className="mt-2 space-y-2">
          {services.map((service) => {
            const product = getServiceLinkedProduct(service, existingResources);
            const line = sale.products.find(
              (candidate) => candidate.gid === product?.optionsPayload?.gid
            );
            return (
              <div
                key={service.id}
                className="flex justify-between gap-4 text-sm text-gray-700"
              >
                <span>{service.title}</span>
                {line && (
                  <span className="font-bold">{formatLineTotal(line)}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderAppointment = (sale: SaleEntity) => {
    if (!sale.booking) return null;
    const services = resolveBookingServices(sale);
    return (
      <div className="rounded-md border border-gray-200 bg-white p-3">
        <div className="text-xs font-bold uppercase text-gray-500">
          Appointment
        </div>
        <div className="mt-2 grid gap-2 text-sm text-gray-700 md:grid-cols-2">
          <div>
            <span className="font-bold">Status:</span> {sale.booking.status}
          </div>
          <div>
            <span className="font-bold">Mode:</span>{' '}
            {sale.booking.appointmentMode || 'IN_PERSON'}
          </div>
          <div>
            <span className="font-bold">Date:</span>{' '}
            {new Date(sale.booking.startTime).toLocaleDateString()}
          </div>
          <div>
            <span className="font-bold">Time:</span>{' '}
            {new Date(sale.booking.startTime).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}{' '}
            -{' '}
            {new Date(sale.booking.endTime).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
          <div>
            <span className="font-bold">Google sync:</span>{' '}
            {sale.booking.googleSyncStatus || 'NOT_SYNCED'}
          </div>
          <div>
            <span className="font-bold">Customer:</span> {customerLabel(sale)}
          </div>
        </div>
        {services.length > 0 && (
          <div className="mt-3 text-sm text-gray-700">
            <span className="font-bold">Services:</span>{' '}
            {services.map((service) => service.title).join(', ')}
          </div>
        )}
        {sale.booking.googleMeetURL && (
          <a
            className="mt-2 inline-block text-sm text-cyan-700 underline"
            href={sale.booking.googleMeetURL}
            target="_blank"
            rel="noreferrer"
          >
            Meet link
          </a>
        )}
      </div>
    );
  };

  const renderExpandedRow = (sale: SaleEntity) => (
    <tr>
      <td colSpan={5} className="bg-gray-50 px-6 py-4">
        <div className="space-y-4">
          <div className="rounded-md border border-gray-200 bg-white p-3">
            <div className="text-xs font-bold uppercase text-gray-500">
              Products
            </div>
            <div className="mt-2 divide-y divide-gray-100">
              {sale.products.map((line) => {
                const product = resourceById.get(line.resourceId);
                const variant = variantTitle(line);
                return (
                  <div
                    key={`${line.resourceId}-${line.variantId}`}
                    className="flex flex-wrap items-center justify-between gap-3 py-2 text-sm"
                  >
                    <div>
                      <div className="font-bold text-gray-900">
                        {line.title || product?.title || 'Product'}
                      </div>
                      {variant && (
                        <div className="text-xs text-gray-500">{variant}</div>
                      )}
                      {line.isLocalPickup && (
                        <span className="mt-1 inline-flex rounded-full bg-cyan-100 px-2 py-0.5 text-xs font-bold text-cyan-800">
                          Local pickup
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-gray-900">
                        {formatLineTotal(line)}
                      </div>
                      <div className="text-xs text-gray-500">
                        Qty {line.quantity || 1}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          {renderSharedFeeBlock(sale)}
          {renderNonSharedServices(sale)}
          {renderAppointment(sale)}
          {sale.tags.includes('orphan') && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-800">
              Orphaned payment: appointment payment received with no active
              booking row.
            </div>
          )}
        </div>
      </td>
    </tr>
  );

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">
                Sale
              </th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">
                Status / Tags
              </th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">
                Customer
              </th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">
                Products
              </th>
              <th className="px-6 py-3 text-right text-xs font-bold uppercase tracking-wider text-gray-500">
                Total
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="py-12 text-center">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-cyan-600" />
                </td>
              </tr>
            ) : sales.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-gray-500">
                  No sales found.
                </td>
              </tr>
            ) : (
              sales.map((sale) => {
                const expanded = expandedRows.has(sale.id);
                return (
                  <Fragment key={sale.id}>
                    <tr className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                        <button
                          onClick={() => toggleExpanded(sale.id)}
                          className="inline-flex items-center gap-2 font-bold text-gray-900"
                        >
                          {expanded ? (
                            <ChevronDownIcon className="h-4 w-4" />
                          ) : (
                            <ChevronRightIcon className="h-4 w-4" />
                          )}
                          {new Date(sale.createdAt).toLocaleDateString()}
                        </button>
                        <div className="mt-1">
                          <a
                            href={`https://admin.shopify.com/orders/${sale.shopifyOrderId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-bold text-cyan-600 hover:text-cyan-800 hover:underline"
                          >
                            Order #{sale.shopifyOrderId}
                          </a>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs">
                        <div className="flex flex-col gap-1">
                          <span
                            className={`inline-flex w-fit items-center rounded-full px-2 py-0.5 font-bold ${getStatusColor(
                              sale.status
                            )}`}
                          >
                            {sale.status}
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {sale.tags.map((tag) => (
                              <span
                                key={tag}
                                className={`inline-flex w-fit items-center rounded-full px-2 py-0.5 font-bold ${getTagColor(
                                  tag
                                )}`}
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {customerLabel(sale)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {productSummary(sale)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-bold text-gray-900">
                        {formatMoney(sale.totalAmount)}
                      </td>
                    </tr>
                    {expanded && renderExpandedRow(sale)}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 pt-4">
          <button
            onClick={() => setCurrentPage((page) => page - 1)}
            disabled={currentPage === 0 || isLoading}
            className="rounded border border-gray-300 bg-white px-3 py-1 text-sm shadow-sm hover:bg-gray-50 disabled:opacity-50"
          >
            Previous
          </button>
          <span className="flex items-center text-sm text-gray-600">
            Page {currentPage + 1} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((page) => page + 1)}
            disabled={currentPage === totalPages - 1 || isLoading}
            className="rounded border border-gray-300 bg-white px-3 py-1 text-sm shadow-sm hover:bg-gray-50 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
