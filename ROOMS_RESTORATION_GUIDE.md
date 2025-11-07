# Rooms Page Restoration Guide

## What Was Lost

The git checkout removed the following major features:

### 1. Vacant Apartments Grid (4 columns)
- Compact cards showing: Apartment Name + Activity Badge + HW/HK Status
- 4 columns on desktop (sm, md, lg, xl)
- 2 columns on mobile (xs)

### 2. Non-Vacant Apartments Grid (Original layout)
- Full detailed cards for occupied/checkout/checkin apartments
- Shows all guest information

### 3. HW/HK Status Display
- Side-by-side status boxes for vacant apartments
- Green for Clean, Orange for Not Clean

## Manual Restoration Steps

Since automated edits failed due to file formatting issues, here's how to manually restore:

### Step 1: Find Line 1043
Look for: `filteredListings.length > 0 ? (`

### Step 2: Replace the single map with dual structure

**BEFORE (line 1043-1044):**
```javascript
) : filteredListings.length > 0 ? (
  filteredListings.map((listing, index) => (
```

**AFTER:**
```javascript
) : filteredListings.length > 0 ? (
  <>
    {/* Vacant Apartments Grid - More columns */}
    {[...filteredListings].filter(l => l.activity === 'Vacant').length > 0 && (
      <MDBox sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: 'repeat(2, 1fr)',
          sm: 'repeat(4, 1fr)',
          md: 'repeat(4, 1fr)',
          lg: 'repeat(4, 1fr)',
          xl: 'repeat(4, 1fr)'
        },
        gap: { xs: 1.5, sm: 2, md: 2 },
        width: '100%',
        mb: 3,
        justifyItems: 'stretch',
        alignItems: 'start'
      }}>
        {[...filteredListings].filter(l => l.activity === 'Vacant').map((listing, index) => (
```

### Step 3: Modify the Card styling (around line 1045-1063)

Change the Card component to have conditional styling for vacant apartments:

```javascript
<Card
  key={listing.id}
  sx={{
    backgroundColor: listing.activity === 'Vacant' ? 'transparent' : '#fefefe',
    borderRadius: listing.activity === 'Vacant' ? '0' : { xs: '16px', md: '20px' },
    border: listing.activity === 'Vacant' ? 'none' : '1px solid #f1f5f9',
    boxShadow: listing.activity === 'Vacant' ? 'none' : '0 2px 8px rgba(0, 0, 0, 0.04), 0 1px 3px rgba(0, 0, 0, 0.06)',
    overflow: 'visible',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    position: 'relative',
    minHeight: listing.activity === 'Vacant' ? 'auto' : 'auto',
    display: 'flex',
    flexDirection: 'column',
    p: 0,
    '&:hover': {
      boxShadow: listing.activity === 'Vacant' ? 'none' : '0 8px 25px rgba(0, 0, 0, 0.08), 0 3px 10px rgba(0, 0, 0, 0.1)',
      transform: listing.activity === 'Vacant' ? 'none' : 'translateY(-4px)',
      borderColor: listing.activity === 'Vacant' ? 'transparent' : '#e2e8f0'
    }
  }}
>
```

### Step 4: Update Apartment Header (around line 1066-1106)

Change the header MDBox to:

```javascript
<MDBox sx={{ 
  backgroundColor: listing.activity === 'Vacant' ? '#ffffff' : '#f8fafc',
  p: listing.activity === 'Vacant' ? { xs: 1, sm: 1 } : { xs: 2.5, sm: 2 },
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: { xs: 1, sm: 1.5 },
  borderBottom: listing.activity === 'Vacant' ? 'none' : '1px solid #e2e8f0',
  border: listing.activity === 'Vacant' ? '1px solid #d1d5db' : 'none',
  borderRadius: listing.activity === 'Vacant' ? '8px 8px 0 0' : '0',
  width: '100%'
}}>
  <MDTypography variant="h6" fontWeight="bold" sx={{ 
    fontSize: (listing.name && listing.name.length > 12) 
      ? { xs: '0.65rem', sm: '0.7rem' } 
      : { xs: '0.9rem', sm: '0.85rem' },
    color: '#1e293b',
    letterSpacing: '0.3px',
    whiteSpace: 'nowrap'
  }}>
    {listing.name || 'Unknown Apartment'}
  </MDTypography>
  {/* Activity Status Badge */}
  <MDBox sx={{
    display: 'inline-flex',
    alignItems: 'center',
    backgroundColor: listing.activity === 'Vacant' ? '#f0fdf4' : 
                   listing.activity === 'Occupied' ? '#fef2f2' :
                   listing.activity === 'Checkin' ? '#f0f9ff' :
                   listing.activity === 'Checkout' ? '#fffbeb' : '#f9fafb',
    color: listing.activity === 'Vacant' ? '#15803d' : 
          listing.activity === 'Occupied' ? '#dc2626' :
          listing.activity === 'Checkin' ? '#0284c7' :
          listing.activity === 'Checkout' ? '#d97706' : '#6b7280',
    px: { xs: 1.2, sm: 1.5 },
    py: { xs: 0.3, sm: 0.4 },
    borderRadius: { xs: '6px', sm: '5px' },
    fontSize: { xs: '0.7rem', sm: '0.65rem' },
    fontWeight: 600,
    border: listing.activity === 'Vacant' ? '1px solid #dcfce7' : 
           listing.activity === 'Occupied' ? '1px solid #fee2e2' :
           listing.activity === 'Checkin' ? '1px solid #e0f2fe' :
           listing.activity === 'Checkout' ? '1px solid #fed7aa' : '1px solid #e5e7eb',
    whiteSpace: 'nowrap'
  }}>
    {listing.activity || 'Unknown'}
  </MDBox>
</MDBox>
```

### Step 5: Add HW/HK Status Section (After the header, before card content)

Add this right after the header MDBox closes:

```javascript
{/* HW/HK Status - Show for vacant apartments */}
{listing.activity === 'Vacant' && (
  <MDBox sx={{ 
    display: 'flex',
    gap: { xs: 2, sm: 3 },
    p: { xs: 1, sm: 1 },
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    border: '1px solid #d1d5db',
    borderTop: 'none',
    borderRadius: '0 0 8px 8px',
    backgroundColor: '#ffffff'
  }}>
    {/* HW Status */}
    <MDBox sx={{
      backgroundColor: listing.hwStatus === 'Clean' ? '#f0fdf4' : '#fffbeb',
      color: listing.hwStatus === 'Clean' ? '#15803d' : '#d97706',
      p: { xs: 0.6, sm: 0.7 },
      px: { xs: 1.5, sm: 2 },
      borderRadius: '6px',
      fontSize: { xs: '0.65rem', sm: '0.7rem' },
      fontWeight: 600,
      textAlign: 'center',
      border: listing.hwStatus === 'Clean' ? '1px solid #dcfce7' : '1px solid #fed7aa',
      whiteSpace: 'nowrap'
    }}>
      HW Status: {listing.hwStatus || 'N/A'}
    </MDBox>
    
    {/* HK Status */}
    <MDBox sx={{
      backgroundColor: listing.hkStatus === 'Clean' ? '#f0fdf4' : '#fffbeb',
      color: listing.hkStatus === 'Clean' ? '#15803d' : '#d97706',
      p: { xs: 0.6, sm: 0.7 },
      px: { xs: 1.5, sm: 2 },
      borderRadius: '6px',
      fontSize: { xs: '0.65rem', sm: '0.7rem' },
      fontWeight: 600,
      textAlign: 'center',
      border: listing.hkStatus === 'Clean' ? '1px solid #dcfce7' : '1px solid #fed7aa',
      whiteSpace: 'nowrap'
    }}>
      HK Status: {listing.hkStatus || 'N/A'}
    </MDBox>
  </MDBox>
)}
```

### Step 6: Wrap Card Content (around line 1108)

Change:
```javascript
{/* Card Content */}
<MDBox sx={{ 
```

To:
```javascript
{/* Card Content - Only show for non-vacant apartments */}
{listing.activity !== 'Vacant' && (
<MDBox sx={{ 
  pt: { xs: 1.5, sm: 2, md: 2.5 },
  px: { xs: 1.5, sm: 2, md: 2.5 },
  pb: 0,
  flex: 1,
  display: 'flex',
  flexDirection: 'column'
}}>
```

### Step 7: Close the Card Content wrapper

Before the `</Card>` closing tag (around line 1391), add:
```javascript
</MDBox>
)}
```

### Step 8: Close the Vacant Grid and Add Non-Vacant Grid

After the `</Card>` closing tag (around line 1392), change:
```javascript
</Card>
  ))
```

To:
```javascript
</Card>
        ))}
      </MDBox>
    )}

    {/* Non-Vacant Apartments Grid - Original layout */}
    {[...filteredListings].filter(l => l.activity !== 'Vacant').length > 0 && (
      <MDBox sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr',
          sm: 'repeat(2, 1fr)',
          md: 'repeat(2, 1fr)',
          lg: 'repeat(3, 1fr)',
          xl: 'repeat(4, 1fr)'
        },
        gap: { xs: 2, sm: 2.5, md: 3 },
        width: '100%'
      }}>
        {[...filteredListings].filter(l => l.activity !== 'Vacant').map((listing, index) => (
          // Copy the ENTIRE Card component here (same as vacant apartments)
          // This creates a duplicate of the card structure for non-vacant apartments
        ))}
      </MDBox>
    )}
  </>
```

### Step 9: Update "No apartments" message

Change line 1395:
```javascript
<MDBox textAlign="center" py={4} sx={{ gridColumn: '1 / -1' }}>
```

To:
```javascript
<MDBox textAlign="center" py={4}>
```

## Summary

This creates two separate grids:
1. **Vacant Grid**: 4 columns, compact cards with HW/HK status
2. **Non-Vacant Grid**: Original layout with full details

The key is filtering the listings array twice - once for vacant, once for non-vacant.
