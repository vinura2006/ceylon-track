# Ceylon Track — Train Reliability Badge System & Statistics

This document outlines the statistical data, mathematical formulas, and badge thresholds used by Ceylon Track to compute and render live reliability badges for passenger train schedules.

---

## 1. Reliability Calculation Methodology

Reliability scores are computed dynamically by the backend using historical trip status logs stored in the `trip_status_updates` table. The calculation is run at the database level to ensure low-latency API responses.

### Mathematical Formula
$$\text{Reliability Score} = \text{ROUND}\left( \frac{\text{Count}(\text{ON\_TIME Trips})}{\text{Count}(\text{Total Trips})} \times 100 \right)$$

* **Total Trips**: Includes all logged trips for a given schedule that have status entries (`ON_TIME`, `DELAYED`, or `CANCELLED`).
* **ON_TIME Trips**: Trips where the train arrived or operated without a delay status.
* **Excluded**: Trips that have not occurred yet or have no logged status update.

---

## 2. Badge Thresholds and Classifications

Ceylon Track uses three distinct badge categories to visually alert passengers of a train's historic punctuality:

| Badge | Class Name | Score Range | UI Representation | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Usually On Time** | `USUALLY_ON_TIME` | **80% – 100%** | 🟩 Green Badge | The train is highly reliable and almost always runs on schedule. |
| **Sometimes Delayed** | `SOMETIMES_DELAYED` | **50% – 79%** | 🟧 Orange Badge | The train experiences minor delays occasionally; passengers should expect minor variance. |
| **Often Late** | `OFTEN_LATE` | **0% – 49%** | 🟥 Red Badge | The train has chronic delay or cancellation issues. Plan buffer time. |

---

## 3. Seeded Train Statistics (Based on 30-Day Simulation)

A 30-day simulation of historical trip statuses has been generated for all 8 core Sri Lankan train schedules. The resulting statistics and classifications are detailed below:

### High Reliability (`🟩 USUALLY_ON_TIME`)

1. **Train 1015 (Intercity Return)**
   * **Route**: Kandy (KAN) → Colombo Fort (FOT)
   * **Total Trips**: 32
   * **On Time**: 30 | **Delayed**: 2 | **Cancelled**: 0
   * **Reliability Score**: **94%**

2. **Train 1068 (Yal Devi)**
   * **Route**: Colombo Fort (FOT) → Anuradhapura (ANP)
   * **Total Trips**: 32
   * **On Time**: 28 | **Delayed**: 2 | **Cancelled**: 2
   * **Reliability Score**: **88%**

3. **Train 1014 (Intercity Express)**
   * **Route**: Colombo Fort (FOT) → Kandy (KAN)
   * **Total Trips**: 32
   * **On Time**: 27 | **Delayed**: 4 | **Cancelled**: 1
   * **Reliability Score**: **84%**

### Moderate Reliability (`🟧 SOMETIMES_DELAYED`)

4. **Train 1084 (Coastal Line)**
   * **Route**: Colombo Fort (FOT) → Galle (GAL)
   * **Total Trips**: 32
   * **On Time**: 23 | **Delayed**: 8 | **Cancelled**: 1
   * **Reliability Score**: **72%**

5. **Train 1005 (Udarata Menike)**
   * **Route**: Colombo Fort (FOT) → Badulla (BAD)
   * **Total Trips**: 32
   * **On Time**: 21 | **Delayed**: 10 | **Cancelled**: 1
   * **Reliability Score**: **66%**

6. **Train 1022 (Kurunegala Express)**
   * **Route**: Colombo Fort (FOT) → Kurunegala (KUR)
   * **Total Trips**: 32
   * **On Time**: 19 | **Delayed**: 8 | **Cancelled**: 5
   * **Reliability Score**: **59%**

### Poor Reliability (`🟥 OFTEN_LATE`)

7. **Train 1086 (Ruhunu Kumari)**
   * **Route**: Colombo Fort (FOT) → Matara (MAT)
   * **Total Trips**: 32
   * **On Time**: 14 | **Delayed**: 12 | **Cancelled**: 6
   * **Reliability Score**: **44%**

8. **Train 1083 (Coastal Return)**
   * **Route**: Galle (GAL) → Colombo Fort (FOT)
   * **Total Trips**: 32
   * **On Time**: 10 | **Delayed**: 18 | **Cancelled**: 4
   * **Reliability Score**: **31%**

---

## 4. Frontend Integration

Reliability badges are rendered dynamically on:
1. **Search Results Page** (`results.html`): Displays badge status when listing matching train results.
2. **Timetable / Booking Page** (`timetable.html`): Injects badges adjacent to train schedules.
3. **Admin Dashboard** (`admin.html`): Displays stats summaries to track general performance.

Badge styling is handled via standard HSL variables in `index.css`:
```css
.badge-usually-on-time { background: hsl(142, 70%, 15%); color: hsl(142, 76%, 70%); border: 1px solid hsl(142, 60%, 30%); }
.badge-sometimes-delayed { background: hsl(35, 70%, 15%); color: hsl(35, 80%, 65%); border: 1px solid hsl(35, 60%, 30%); }
.badge-often-late { background: hsl(0, 70%, 15%); color: hsl(0, 85%, 65%); border: 1px solid hsl(0, 60%, 30%); }
```
