export type BillingUnit = 'month' | 'day'

export interface ManagedServicePackage {
  id: string
  name: string
  checkoutName: string
  description: string
  amountUsd: number
  termMonths: number
  termLabel: string
  billingUnit?: BillingUnit
  monthlyUsd?: number | null
  dailyUsd?: number | null
  checkoutBillingPeriod?: string
  checkoutEmail?: string
  billable?: boolean
  inquiryOnly?: boolean
  category: 'Compute' | 'Data and delivery' | 'Operations' | 'Messaging' | 'App distribution' | 'Development' | 'Custom services'
  highlights: string[]
}

export const managedServicePackages: readonly ManagedServicePackage[] = [
  {
    id: 'backend',
    name: 'Backend Server',
    checkoutName: 'Render Backend Server (Pro Max, 16GB/4CPU)',
    description: 'Managed application hosting for API and server-side workloads.',
    amountUsd: 240,
    termMonths: 12,
    termLabel: '12 months',
    category: 'Compute',
    highlights: ['Pro Max · 16 GB RAM · 4 CPU', 'Managed subscription administration'],
  },
  {
    id: 'frontend',
    name: 'Frontend Server',
    checkoutName: 'Render Frontend Server (Pro Plus, 8GB/4CPU)',
    description: 'Managed hosting for customer-facing websites and web applications.',
    amountUsd: 2100,
    termMonths: 12,
    termLabel: '12 months',
    category: 'Compute',
    highlights: ['Pro Plus · 8 GB RAM · 4 CPU', 'Managed subscription administration'],
  },
  {
    id: 'postgresql',
    name: 'PostgreSQL Primary',
    checkoutName: 'Render PostgreSQL Primary (16GB/4CPU, pooled)',
    description: 'Managed subscription for a production PostgreSQL database.',
    amountUsd: 4200,
    termMonths: 12,
    termLabel: '12 months',
    category: 'Data and delivery',
    highlights: ['16 GB RAM · 4 CPU · pooled', 'Managed subscription administration'],
  },
  {
    id: 'persistent-disk',
    name: 'Persistent Disk Storage',
    checkoutName: 'Render Persistent Disk Storage',
    description: 'Persistent storage managed alongside your application services.',
    amountUsd: 240,
    termMonths: 12,
    termLabel: '12 months',
    category: 'Data and delivery',
    highlights: ['One-year service term', 'Managed subscription administration'],
  },
  {
    id: 'cdn',
    name: 'Content Delivery Network',
    checkoutName: 'Render CDN',
    description: 'Managed CDN subscription for distributing application content.',
    amountUsd: 240,
    termMonths: 12,
    termLabel: '12 months',
    category: 'Data and delivery',
    highlights: ['One-year service term', 'Managed subscription administration'],
  },
  {
    id: 'cache',
    name: 'Managed Cache',
    checkoutName: 'Render Cache',
    description: 'Managed cache subscription for application data and performance needs.',
    amountUsd: 240,
    termMonths: 12,
    termLabel: '12 months',
    category: 'Data and delivery',
    highlights: ['One-year service term', 'Managed subscription administration'],
  },
  {
    id: 'ssl-domain',
    name: 'SSL Certificate and Domain',
    checkoutName: 'Render SSL Certificate & Domain',
    description: 'Managed subscription for domain and SSL certificate services.',
    amountUsd: 156,
    termMonths: 12,
    termLabel: '12 months',
    category: 'Operations',
    highlights: ['One-year service term', 'Managed subscription administration'],
  },
  {
    id: 'monitoring',
    name: 'Monitoring and Alerting',
    checkoutName: 'Render Monitoring and Alerting (Uptime/APM)',
    description: 'Uptime and application monitoring managed for your service.',
    amountUsd: 240,
    termMonths: 12,
    termLabel: '12 months',
    category: 'Operations',
    highlights: ['Uptime and APM monitoring', 'One-year service term'],
  },
  {
    id: 'file-server',
    name: 'File Server',
    checkoutName: 'Render File Server',
    description: 'Managed file server subscription for storing and serving application files.',
    amountUsd: 270,
    termMonths: 5,
    termLabel: '5 months',
    category: 'Compute',
    highlights: ['Five-month service term', 'Managed subscription administration'],
  },
  {
    id: 'aws-s3-storage',
    name: 'AWS S3 Storage',
    checkoutName: 'AWS S3 Storage',
    description: 'Cloud object storage for application files and documents, with versioning to help recover earlier copies.',
    amountUsd: 480,
    monthlyUsd: 40,
    termMonths: 12,
    termLabel: '12 months',
    checkoutBillingPeriod: 'Oct 1, 2026 - Sep 30, 2027 (12 months)',
    category: 'Data and delivery',
    highlights: ['File and document storage', 'Versioned copies for recovery'],
  },
  {
    id: 'aws-ses',
    name: 'AWS SES Email Service',
    checkoutName: 'AWS SES (Simple Email Service)',
    description: 'Application email delivery for operational notices such as alerts, approvals and reminders.',
    amountUsd: 240,
    monthlyUsd: 20,
    termMonths: 12,
    termLabel: '12 months',
    checkoutBillingPeriod: 'Oct 1, 2026 - Sep 30, 2027 (12 months)',
    category: 'Messaging',
    highlights: ['Automated application emails', 'Annual estimate based on the workbook'],
  },
  {
    id: 'redis-cache',
    name: 'Redis Cache (Managed, Pro)',
    checkoutName: 'Redis Cache (Managed, Pro)',
    description: 'Managed Redis cache for frequently used data, reducing repeated reads from the primary database.',
    amountUsd: 240,
    monthlyUsd: 20,
    termMonths: 12,
    termLabel: '12 months',
    checkoutBillingPeriod: 'Oct 1, 2026 - Sep 30, 2027 (12 months)',
    category: 'Data and delivery',
    highlights: ['Managed Redis service', 'Annual estimate based on the workbook'],
  },
  {
    id: 'cloudflare-security',
    name: 'Cloudflare CDN, WAF and DDoS Protection',
    checkoutName: 'Cloudflare CDN, WAF & DDoS Protection (Business)',
    description: 'Content delivery and an edge security layer with web application firewall and DDoS protection.',
    amountUsd: 240,
    monthlyUsd: 20,
    termMonths: 12,
    termLabel: '12 months',
    checkoutBillingPeriod: 'Oct 1, 2026 - Sep 30, 2027 (12 months)',
    category: 'Data and delivery',
    highlights: ['CDN and web application firewall', 'DDoS protection'],
  },
  {
    id: 'automated-backups',
    name: 'Automated Backups and S3 Versioning',
    checkoutName: 'Automated Backups (DB + S3 versioning)',
    description: 'Scheduled database backups and S3 object versioning to support data recovery.',
    amountUsd: 360,
    monthlyUsd: 30,
    termMonths: 12,
    termLabel: '12 months',
    checkoutBillingPeriod: 'Oct 1, 2026 - Sep 30, 2027 (12 months)',
    category: 'Operations',
    highlights: ['Database backup coverage', 'S3 object versioning'],
  },
  {
    id: 'firebase-cloud-messaging',
    name: 'Firebase Cloud Messaging',
    checkoutName: 'Firebase Cloud Messaging (Push Notifications)',
    description: 'Push notification delivery to supported mobile devices.',
    amountUsd: 0,
    monthlyUsd: 0,
    termMonths: 12,
    termLabel: '12 months',
    checkoutBillingPeriod: 'Oct 1, 2026 - Sep 30, 2027 (12 months)',
    billable: false,
    category: 'Messaging',
    highlights: ['Mobile push notifications', 'No additional charge in the workbook estimate'],
  },
  {
    id: 'domain-name',
    name: 'Domain Name',
    checkoutName: 'Domain Name',
    description: 'A registered domain name for your website or application.',
    amountUsd: 36,
    monthlyUsd: 3,
    termMonths: 12,
    termLabel: '12 months',
    checkoutBillingPeriod: 'Oct 1, 2026 - Sep 30, 2027 (12 months)',
    category: 'Operations',
    highlights: ['Annual domain renewal estimate'],
  },
  {
    id: 'ssl-wildcard',
    name: 'Wildcard SSL Certificate',
    checkoutName: 'SSL Certificate (Wildcard)',
    description: 'TLS certificate coverage for a domain and its subdomains.',
    amountUsd: 120,
    monthlyUsd: 10,
    termMonths: 12,
    termLabel: '12 months',
    checkoutBillingPeriod: 'Oct 1, 2026 - Sep 30, 2027 (12 months)',
    category: 'Operations',
    highlights: ['Wildcard domain coverage', 'Annual estimate based on the workbook'],
  },
  {
    id: 'twilio-sms',
    name: 'Twilio SMS (Nigeria, 500 messages/month)',
    checkoutName: 'Twilio SMS - Outbound (Nigeria)',
    description: 'Outbound SMS for sign-in codes and important service notifications in Nigeria.',
    amountUsd: 2320.8,
    monthlyUsd: 193.4,
    termMonths: 12,
    termLabel: '12 months',
    checkoutBillingPeriod: 'Oct 1, 2026 - Sep 30, 2027 (12 months)',
    category: 'Messaging',
    highlights: ['Estimated volume: 500 messages per month', 'Usage and carrier fees may vary'],
  },
  {
    id: 'twilio-whatsapp',
    name: 'Twilio WhatsApp Business (1,000 messages/month)',
    checkoutName: 'Twilio WhatsApp Business Messaging (Nigeria)',
    description: 'WhatsApp Business messaging for service notifications, estimated at 1,000 messages per month.',
    amountUsd: 180,
    monthlyUsd: 15,
    termMonths: 12,
    termLabel: '12 months',
    checkoutBillingPeriod: 'Oct 1, 2026 - Sep 30, 2027 (12 months)',
    category: 'Messaging',
    highlights: ['Estimated volume: 1,000 messages per month', 'Usage and template fees may vary'],
  },
  {
    id: 'twilio-sender-registration',
    name: 'Twilio Sender ID and WhatsApp Sender Setup',
    checkoutName: 'Twilio Alphanumeric Sender ID + WhatsApp Sender',
    description: 'Sender name and WhatsApp sender registration for supported messaging services.',
    amountUsd: 0,
    monthlyUsd: 0,
    termMonths: 12,
    termLabel: '12 months',
    checkoutBillingPeriod: 'Oct 1, 2026 - Sep 30, 2027 (12 months)',
    billable: false,
    category: 'Messaging',
    highlights: ['Sender identity setup', 'No additional charge in the workbook estimate'],
  },
  {
    id: 'google-play-developer-account',
    name: 'Google Play Developer Account Setup',
    checkoutName: 'Google Play Developer Account (Play Store hosting)',
    description: 'One-time Google Play developer account fee for publishing an Android application.',
    amountUsd: 100,
    monthlyUsd: null,
    termMonths: 0,
    termLabel: 'One-time',
    checkoutBillingPeriod: 'One-time setup fee',
    category: 'App distribution',
    highlights: ['One-time account fee', 'No annual renewal listed in the workbook'],
  },
  {
    id: 'mobile-app-development',
    name: 'Mobile App Development',
    checkoutName: 'Mobile App Development',
    description: 'Custom Android and iOS applications, including product planning, implementation, integrations and release preparation.',
    amountUsd: 0,
    monthlyUsd: null,
    termMonths: 0,
    termLabel: 'Custom quote',
    billable: false,
    inquiryOnly: true,
    category: 'Development',
    highlights: ['Android and iOS apps', 'Scope and pricing agreed before work begins'],
  },
  {
    id: 'web-app-development',
    name: 'Web App and Portal Development',
    checkoutName: 'Web App and Portal Development',
    description: 'Custom websites, web applications and internal portals designed around your business workflow.',
    amountUsd: 0,
    monthlyUsd: null,
    termMonths: 0,
    termLabel: 'Custom quote',
    billable: false,
    inquiryOnly: true,
    category: 'Development',
    highlights: ['Business websites and web applications', 'Fixed scope and quote after discovery'],
  },
  {
    id: 'custom-software-integrations',
    name: 'Custom Software and API Integrations',
    checkoutName: 'Custom Software and API Integrations',
    description: 'Purpose-built business software, system integrations and automation based on your requirements.',
    amountUsd: 0,
    monthlyUsd: null,
    termMonths: 0,
    termLabel: 'Custom quote',
    billable: false,
    inquiryOnly: true,
    category: 'Development',
    highlights: ['Custom workflows and integrations', 'Estimate depends on scope and delivery needs'],
  },
  {
    id: 'cloud-devops-services',
    name: 'Cloud Setup, Deployment and DevOps',
    checkoutName: 'Cloud Setup, Deployment and DevOps',
    description: 'Cloud environment setup, deployment pipelines, migrations and infrastructure administration.',
    amountUsd: 0,
    monthlyUsd: null,
    termMonths: 0,
    termLabel: 'Custom quote',
    billable: false,
    inquiryOnly: true,
    category: 'Custom services',
    highlights: ['Setup, migration and deployment', 'Ongoing management can be scoped separately'],
  },
  {
    id: 'support-maintenance',
    name: 'Technical Support and Maintenance',
    checkoutName: 'Technical Support and Maintenance',
    description: 'Application support, maintenance and technical assistance arranged around your service requirements.',
    amountUsd: 0,
    monthlyUsd: null,
    termMonths: 0,
    termLabel: 'Custom quote',
    billable: false,
    inquiryOnly: true,
    category: 'Custom services',
    highlights: ['Support plans scoped to your team', 'Contact us for availability and pricing'],
  },
  {
    id: 'health-check',
    name: 'Infrastructure Health Check',
    checkoutName: 'Render Infrastructure Health Check (24/7 Probes)',
    description: 'Continuous daily endpoint health checks, latency monitoring, and automated service status verification.',
    amountUsd: 0.5,
    billingUnit: 'day',
    dailyUsd: 0.5,
    monthlyUsd: null,
    termMonths: 1,
    termLabel: '1 day',
    checkoutEmail: 'mbesseygodwin@gmail.com',
    category: 'Operations',
    highlights: ['$0.50 per day continuous health checks', 'Automated uptime probes and incident alerts'],
  },
  {
    id: 'staging-environment',
    name: 'Staging and Preview Environments',
    checkoutName: 'Render Staging & Preview Environments',
    description: 'Isolated staging instances and pull-request preview environments for pre-production verification.',
    amountUsd: 540,
    monthlyUsd: 45,
    termMonths: 12,
    termLabel: '12 months',
    category: 'Compute',
    highlights: ['Isolated staging server', 'Pull-request preview deployments'],
  },
  {
    id: 'background-worker',
    name: 'Background Worker and Queue Processor',
    checkoutName: 'Render Background Worker & Queue Processor',
    description: 'Dedicated worker compute for asynchronous jobs, scheduled cron tasks, and queue processing.',
    amountUsd: 420,
    monthlyUsd: 35,
    termMonths: 12,
    termLabel: '12 months',
    category: 'Compute',
    highlights: ['Dedicated worker instance', 'Cron jobs and queue processing'],
  },
  {
    id: 'load-balancer',
    name: 'Managed Load Balancer and Auto-Scaling',
    checkoutName: 'Render Load Balancer & Auto-Scaling',
    description: 'Managed Layer-7 load balancing with health-based failover and horizontal auto-scaling.',
    amountUsd: 600,
    monthlyUsd: 50,
    termMonths: 12,
    termLabel: '12 months',
    category: 'Compute',
    highlights: ['Layer-7 traffic distribution', 'Automatic failover and scaling'],
  },
  {
    id: 'postgres-read-replica',
    name: 'PostgreSQL Read Replica',
    checkoutName: 'Render PostgreSQL Read Replica (16GB/4CPU)',
    description: 'Dedicated read-only PostgreSQL replica for analytics workloads and high-traffic read scaling.',
    amountUsd: 2160,
    monthlyUsd: 180,
    termMonths: 12,
    termLabel: '12 months',
    category: 'Data and delivery',
    highlights: ['Low-latency read scaling', 'Continuous replication from primary DB'],
  },
  {
    id: 'container-registry',
    name: 'Managed Container Registry',
    checkoutName: 'Managed Private Container Registry',
    description: 'Private Docker and OCI container image registry with automated vulnerability scanning.',
    amountUsd: 180,
    monthlyUsd: 15,
    termMonths: 12,
    termLabel: '12 months',
    category: 'Data and delivery',
    highlights: ['Private OCI/Docker repositories', 'Automated image vulnerability scans'],
  },
  {
    id: 'log-management',
    name: 'Centralized Log Management',
    checkoutName: 'Centralized Infrastructure Log Management',
    description: 'Aggregated application and server logs with 30-day searchable retention and alert rules.',
    amountUsd: 360,
    monthlyUsd: 30,
    termMonths: 12,
    termLabel: '12 months',
    category: 'Operations',
    highlights: ['30-day searchable log retention', 'Real-time error stream and alerts'],
  },
  {
    id: 'vpc-networking',
    name: 'Private VPC and Firewall Networking',
    checkoutName: 'Private VPC Networking & Static Egress IPs',
    description: 'Isolated virtual private network, private service-to-service communication, and static outbound IPs.',
    amountUsd: 300,
    monthlyUsd: 25,
    termMonths: 12,
    termLabel: '12 months',
    category: 'Operations',
    highlights: ['Private internal service networking', 'Static outbound IP allowlisting'],
  },
  {
    id: 'cicd-pipeline',
    name: 'CI/CD Build and Deployment Pipeline',
    checkoutName: 'Managed CI/CD Build & Deployment Pipeline',
    description: 'Automated build runners, zero-downtime release pipelines, and instant rollback support.',
    amountUsd: 300,
    monthlyUsd: 25,
    termMonths: 12,
    termLabel: '12 months',
    category: 'Operations',
    highlights: ['Zero-downtime release automation', 'Instant rollback and build caching'],
  },
  {
    id: 'disaster-recovery',
    name: 'Disaster Recovery and Cross-Region Failover',
    checkoutName: 'Cross-Region Disaster Recovery & Failover',
    description: 'Automated cross-region snapshot replication and failover readiness for mission-critical workloads.',
    amountUsd: 780,
    monthlyUsd: 65,
    termMonths: 12,
    termLabel: '12 months',
    category: 'Operations',
    highlights: ['Cross-region encrypted replication', 'Documented failover readiness'],
  },
  {
    id: 'wildcard-ucc-ssl',
    name: 'Wildcard UCC SSL Certificates (1 year)',
    checkoutName: 'Wildcard UCC SSL Certificates 1 year',
    description: 'Wildcard UCC SSL Certificates 1 year — this is not included in your bill.',
    amountUsd: 620,
    monthlyUsd: null,
    termMonths: 0,
    termLabel: '1 year',
    checkoutBillingPeriod: 'Wildcard UCC SSL Certificates 1 year — This is not included in your bill',
    checkoutEmail: 'tegaekoh@ccfng.org',
    category: 'Operations',
    highlights: [
      'Wildcard UCC SSL Certificates (1 year)',
      'This is not included in your bill',
    ],
  },
]

export const SCRAMBLED_INVOICE_ACCOUNT = 'acct_1CTbIsBmBV2o9vP5'
export const MIN_BILLING_MONTHS = 1
export const MAX_BILLING_MONTHS = 60
export const MIN_BILLING_DAYS = 1
export const MAX_BILLING_DAYS = 365

export function getManagedServicePackage(id: unknown): ManagedServicePackage | undefined {
  if (typeof id !== 'string') return undefined
  return managedServicePackages.find((service) => service.id === id)
}

export function getBillingUnit(service: ManagedServicePackage): BillingUnit {
  return service.billingUnit === 'day' ? 'day' : 'month'
}

export function getMaxBillingUnits(service: ManagedServicePackage): number {
  return getBillingUnit(service) === 'day' ? MAX_BILLING_DAYS : MAX_BILLING_MONTHS
}

export function isMonthlyAdjustable(service: ManagedServicePackage): boolean {
  return !service.inquiryOnly && service.termMonths > 0
}

export function getUnitUsd(service: ManagedServicePackage): number | null {
  if (service.inquiryOnly) return null
  if (getBillingUnit(service) === 'day') {
    if (service.dailyUsd !== undefined) return service.dailyUsd
    if (service.termMonths > 0) {
      return Math.round((service.amountUsd / service.termMonths) * 100) / 100
    }
    return null
  }
  if (service.monthlyUsd !== undefined) return service.monthlyUsd
  if (service.termMonths > 0) {
    return Math.round((service.amountUsd / service.termMonths) * 100) / 100
  }
  return null
}

export function getMonthlyUsd(service: ManagedServicePackage): number | null {
  if (getBillingUnit(service) === 'day') return null
  return getUnitUsd(service)
}

export function clampBillingMonths(service: ManagedServicePackage, units?: number): number {
  if (!isMonthlyAdjustable(service)) return 0
  if (typeof units !== 'number' || !Number.isFinite(units)) return service.termMonths
  const minUnits = getBillingUnit(service) === 'day' ? MIN_BILLING_DAYS : MIN_BILLING_MONTHS
  const maxUnits = getMaxBillingUnits(service)
  return Math.min(maxUnits, Math.max(minUnits, Math.round(units)))
}

export function calculatePackageAmountUsd(service: ManagedServicePackage, units?: number): number {
  if (service.inquiryOnly || service.billable === false) return 0
  if (!isMonthlyAdjustable(service)) return service.amountUsd
  const unitRate = getUnitUsd(service)
  if (unitRate === null || unitRate <= 0) return 0
  const safeUnits = clampBillingMonths(service, units)
  return Math.round(unitRate * safeUnits * 100) / 100
}

export function formatTermLabel(service: ManagedServicePackage, units?: number): string {
  if (!isMonthlyAdjustable(service)) return service.termLabel
  const safeUnits = clampBillingMonths(service, units)
  const unit = getBillingUnit(service)
  if (unit === 'day') {
    return `${safeUnits} ${safeUnits === 1 ? 'day' : 'days'}`
  }
  return `${safeUnits} ${safeUnits === 1 ? 'month' : 'months'}`
}

export function formatBillingPeriod(service: ManagedServicePackage, units?: number): string {
  if (!isMonthlyAdjustable(service)) {
    return service.checkoutBillingPeriod || service.termLabel
  }
  const safeUnits = clampBillingMonths(service, units)
  const unit = getBillingUnit(service)
  const formatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
  const startDate = new Date(Date.UTC(2026, 9, 1))
  if (unit === 'day') {
    const endDate = new Date(Date.UTC(2026, 9, safeUnits))
    const label = safeUnits === 1 ? 'day' : 'days'
    if (safeUnits === 1) {
      return `Render ${formatter.format(startDate)} (1 day)`
    }
    return `Render ${formatter.format(startDate)} - ${formatter.format(endDate)} (${safeUnits} ${label})`
  }
  const endDate = new Date(Date.UTC(2026, 9 + safeUnits, 0))
  const label = safeUnits === 1 ? 'month' : 'months'
  return `Render ${formatter.format(startDate)} - ${formatter.format(endDate)} (${safeUnits} ${label})`
}

function toBase64Url(input: string): string {
  const bytes = new TextEncoder().encode(input)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function fromBase64Url(encoded: string): string | null {
  try {
    const normalized = encoded.replace(/-/g, '+').replace(/_/g, '/')
    const padLength = (4 - (normalized.length % 4)) % 4
    const binary = atob(normalized + '='.repeat(padLength))
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return new TextDecoder().decode(bytes)
  } catch {
    return null
  }
}

export function buildScrambledInvoicePath(
  service: ManagedServicePackage,
  units?: number,
  customerEmail?: string
): string {
  const safeUnits = clampBillingMonths(service, units)
  const totalUsd = calculatePackageAmountUsd(service, safeUnits)
  const resolvedEmail = service.checkoutEmail
    ? service.checkoutEmail.trim().toLowerCase()
    : typeof customerEmail === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim())
      ? customerEmail.trim().toLowerCase()
      : ''
  const payload = ['v1', service.id, String(safeUnits), resolvedEmail, `${totalUsd.toFixed(2)}USD`].join('|')
  return `/i/${SCRAMBLED_INVOICE_ACCOUNT}/live_${toBase64Url(payload)}`
}

export interface DecodedScrambledInvoice {
  service: ManagedServicePackage
  months: number
  billingUnit: BillingUnit
  totalUsd: number
  monthlyUsd: number
  billingPeriod: string
  customerEmail?: string
  scrambledPath: string
}

export function parseScrambledInvoiceToken(account: string, token: string): DecodedScrambledInvoice | null {
  if (account !== SCRAMBLED_INVOICE_ACCOUNT || !token.startsWith('live_')) {
    return null
  }
  const decoded = fromBase64Url(token.slice(5))
  if (!decoded) return null

  const parts = decoded.split('|')
  if (parts.length < 4 || parts[0] !== 'v1') return null

  const [, serviceId, unitsRaw, emailRaw = ''] = parts
  const service = getManagedServicePackage(serviceId)
  if (!service || service.billable === false || service.inquiryOnly) {
    return null
  }

  const parsedUnits = Number(unitsRaw)
  if (!Number.isInteger(parsedUnits)) return null

  const billingUnit = getBillingUnit(service)
  const minUnits = billingUnit === 'day' ? MIN_BILLING_DAYS : MIN_BILLING_MONTHS
  const maxUnits = getMaxBillingUnits(service)

  if (isMonthlyAdjustable(service)) {
    if (parsedUnits < minUnits || parsedUnits > maxUnits) {
      return null
    }
  } else if (parsedUnits !== 0) {
    return null
  }

  const totalUsd = calculatePackageAmountUsd(service, parsedUnits)
  if (totalUsd <= 0) return null

  const unitUsd = getUnitUsd(service) ?? totalUsd
  const cleanEmail = service.checkoutEmail
    ? service.checkoutEmail.trim().toLowerCase()
    : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw.trim())
      ? emailRaw.trim().toLowerCase()
      : undefined

  return {
    service,
    months: parsedUnits,
    billingUnit,
    totalUsd,
    monthlyUsd: unitUsd,
    billingPeriod: formatBillingPeriod(service, parsedUnits),
    customerEmail: cleanEmail,
    scrambledPath: `/i/${account}/${token}`,
  }
}
