import WidgetKit
import SwiftUI

struct WidgetEntry: TimelineEntry {
    let date: Date
    let totalRevenue: String
    let occupancyRate: String
    let occupiedRooms: Int
    let totalRooms: Int
    let outstandingDebt: String
    let utilityProgress: String
    let openRepairs: Int
}

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> WidgetEntry {
        WidgetEntry(
            date: Date(),
            totalRevenue: "186.883.000đ",
            occupancyRate: "80%",
            occupiedRooms: 8,
            totalRooms: 10,
            outstandingDebt: "12.500.000đ",
            utilityProgress: "6/10 phòng",
            openRepairs: 2
        )
    }

    func getSnapshot(in context: Context, completion: @escaping (WidgetEntry) -> Void) {
        completion(loadData())
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<WidgetEntry>) -> Void) {
        let entry = loadData()
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: Date())!
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
    }

    private func loadData() -> WidgetEntry {
        let defaults = UserDefaults(suiteName: "group.com.trohub.app")
        let jsonString = defaults?.string(forKey: "trohub_widget_json") ?? ""
        
        // Default values
        var revenue = "186.883.000đ"
        var occupancy = "80%"
        var occupied = 8
        var total = 10
        var debt = "12.500.000đ"
        var utility = "6/10 phòng"
        var repairs = 2

        if let data = jsonString.data(using: .utf8),
           let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
            if let revNum = json["totalRevenue"] as? Double {
                let formatter = NumberFormatter()
                formatter.numberStyle = .decimal
                formatter.locale = Locale(identifier: "vi_VN")
                revenue = "\(formatter.string(from: NSNumber(value: revNum)) ?? "0")đ"
            }
            if let rate = json["occupancyRate"] as? Int {
                occupancy = "\(rate)%"
            }
            if let occ = json["occupiedRooms"] as? Int { occupied = occ }
            if let tot = json["totalRooms"] as? Int { total = tot }
            if let debtNum = json["outstandingDebt"] as? Double {
                let formatter = NumberFormatter()
                formatter.numberStyle = .decimal
                formatter.locale = Locale(identifier: "vi_VN")
                debt = "\(formatter.string(from: NSNumber(value: debtNum)) ?? "0")đ"
            }
            if let util = json["utilityReadingProgress"] as? String { utility = util }
            if let rep = json["openRepairsCount"] as? Int { repairs = rep }
        }

        return WidgetEntry(
            date: Date(),
            totalRevenue: revenue,
            occupancyRate: occupancy,
            occupiedRooms: occupied,
            totalRooms: total,
            outstandingDebt: debt,
            utilityProgress: utility,
            openRepairs: repairs
        )
    }
}

// Small Widget View (2x2)
struct SmallWidgetView: View {
    let entry: WidgetEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: "house.fill")
                    .foregroundColor(Color(red: 0.06, green: 0.72, blue: 0.51))
                Text("TROHUB")
                    .font(.caption2)
                    .fontWeight(.black)
                    .foregroundColor(.secondary)
            }
            
            Spacer()

            Text("DOANH THU THÁNG")
                .font(.system(size: 9, weight: .bold))
                .foregroundColor(.secondary)

            Text(entry.totalRevenue)
                .font(.system(size: 15, weight: .heavy))
                .minimumScaleFactor(0.8)

            HStack(spacing: 4) {
                Image(systemName: "chart.pie.fill")
                    .font(.system(size: 10))
                    .foregroundColor(Color(red: 0.06, green: 0.72, blue: 0.51))
                Text("\(entry.occupancyRate) lấp đầy")
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundColor(Color(red: 0.06, green: 0.72, blue: 0.51))
            }
        }
        .padding()
        .containerBackground(for: .widget) {
            Color(UIColor.systemBackground)
        }
    }
}

// Medium Widget View (4x2)
struct MediumWidgetView: View {
    let entry: WidgetEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                HStack(spacing: 6) {
                    Image(systemName: "building.2.fill")
                        .foregroundColor(Color(red: 0.06, green: 0.72, blue: 0.51))
                    Text("TROHUB ADMIN")
                        .font(.caption)
                        .fontWeight(.black)
                }
                Spacer()
                Link(destination: URL(string: "trohub://scan-meter")!) {
                    HStack(spacing: 4) {
                        Image(systemName: "camera.fill")
                            .font(.system(size: 11))
                        Text("Quét Camera")
                            .font(.system(size: 10, weight: .bold))
                    }
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(Color(red: 0.06, green: 0.72, blue: 0.51).opacity(0.15))
                    .foregroundColor(Color(red: 0.06, green: 0.72, blue: 0.51))
                    .cornerRadius(8)
                }
            }

            Divider()

            HStack(spacing: 0) {
                VStack(alignment: .center, spacing: 2) {
                    Text("Công nợ tồn")
                        .font(.system(size: 10, weight: .semibold))
                        .foregroundColor(.secondary)
                    Text(entry.outstandingDebt)
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(.red)
                }
                .frame(maxWidth: .infinity)

                VStack(alignment: .center, spacing: 2) {
                    Text("Chốt điện nước")
                        .font(.system(size: 10, weight: .semibold))
                        .foregroundColor(.secondary)
                    Text(entry.utilityProgress)
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(.orange)
                }
                .frame(maxWidth: .infinity)

                VStack(alignment: .center, spacing: 2) {
                    Text("Sự cố mở")
                        .font(.system(size: 10, weight: .semibold))
                        .foregroundColor(.secondary)
                    Text("\(entry.openRepairs) sự cố")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(.indigo)
                }
                .frame(maxWidth: .infinity)
            }
        }
        .padding()
        .containerBackground(for: .widget) {
            Color(UIColor.systemBackground)
        }
    }
}

// Large Widget View (4x4)
struct LargeWidgetView: View {
    let entry: WidgetEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("TROHUB DASHBOARD")
                        .font(.caption)
                        .fontWeight(.black)
                    Text("TỔNG QUAN VẬN HÀNH DỰ ÁN")
                        .font(.system(size: 9, weight: .bold))
                        .foregroundColor(.secondary)
                }
                Spacer()
                Link(destination: URL(string: "trohub://scan-meter")!) {
                    HStack(spacing: 4) {
                        Image(systemName: "camera.fill")
                            .font(.system(size: 11))
                        Text("Quét Camera")
                            .font(.system(size: 11, weight: .bold))
                    }
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .background(Color(red: 0.06, green: 0.72, blue: 0.51))
                    .foregroundColor(.white)
                    .cornerRadius(10)
                }
            }

            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 8) {
                VStack(alignment: .leading, spacing: 4) {
                    Image(systemName: "dollarsign.circle.fill")
                        .foregroundColor(Color(red: 0.06, green: 0.72, blue: 0.51))
                    Text("Doanh thu tháng")
                        .font(.system(size: 10, weight: .semibold))
                        .foregroundColor(.secondary)
                    Text(entry.totalRevenue)
                        .font(.system(size: 13, weight: .bold))
                }
                .padding(10)
                .background(Color.secondary.opacity(0.1))
                .cornerRadius(12)

                VStack(alignment: .leading, spacing: 4) {
                    Image(systemName: "creditcard.fill")
                        .foregroundColor(.red)
                    Text("Công nợ tồn")
                        .font(.system(size: 10, weight: .semibold))
                        .foregroundColor(.secondary)
                    Text(entry.outstandingDebt)
                        .font(.system(size: 13, weight: .bold))
                        .foregroundColor(.red)
                }
                .padding(10)
                .background(Color.secondary.opacity(0.1))
                .cornerRadius(12)

                VStack(alignment: .leading, spacing: 4) {
                    Image(systemName: "bolt.fill")
                        .foregroundColor(.orange)
                    Text("Chốt điện nước")
                        .font(.system(size: 10, weight: .semibold))
                        .foregroundColor(.secondary)
                    Text(entry.utilityProgress)
                        .font(.system(size: 13, weight: .bold))
                        .foregroundColor(.orange)
                }
                .padding(10)
                .background(Color.secondary.opacity(0.1))
                .cornerRadius(12)

                VStack(alignment: .leading, spacing: 4) {
                    Image(systemName: "wrench.and.screwdriver.fill")
                        .foregroundColor(.indigo)
                    Text("Sự cố mở")
                        .font(.system(size: 10, weight: .semibold))
                        .foregroundColor(.secondary)
                    Text("\(entry.openRepairs) mở")
                        .font(.system(size: 13, weight: .bold))
                        .foregroundColor(.indigo)
                }
                .padding(10)
                .background(Color.secondary.opacity(0.1))
                .cornerRadius(12)
            }

            Spacer()

            HStack(spacing: 8) {
                Link(destination: URL(string: "trohub://invoices")!) {
                    Text("Lập Hóa Đơn")
                        .font(.system(size: 11, weight: .bold))
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 8)
                        .background(Color(red: 0.06, green: 0.72, blue: 0.51).opacity(0.15))
                        .foregroundColor(Color(red: 0.06, green: 0.72, blue: 0.51))
                        .cornerRadius(10)
                }

                Link(destination: URL(string: "trohub://utilities")!) {
                    Text("Điện Nước")
                        .font(.system(size: 11, weight: .bold))
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 8)
                        .background(Color.orange.opacity(0.15))
                        .foregroundColor(.orange)
                        .cornerRadius(10)
                }

                Link(destination: URL(string: "trohub://repairs")!) {
                    Text("Sự Cố")
                        .font(.system(size: 11, weight: .bold))
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 8)
                        .background(Color.indigo.opacity(0.15))
                        .foregroundColor(.indigo)
                        .cornerRadius(10)
                }
            }
        }
        .padding()
        .containerBackground(for: .widget) {
            Color(UIColor.systemBackground)
        }
    }
}

struct TroHubWidgetEntryView : View {
    var entry: Provider.Entry
    @Environment(\.widgetFamily) var family

    var body: some View {
        switch family {
        case .systemSmall:
            SmallWidgetView(entry: entry)
        case .systemMedium:
            MediumWidgetView(entry: entry)
        case .systemLarge:
            LargeWidgetView(entry: entry)
        @unknown default:
            SmallWidgetView(entry: entry)
        }
    }
}

@main
struct TroHubWidget: Widget {
    let kind: String = "TroHubWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            TroHubWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("TroHub Admin Widget")
        .description("Theo dõi doanh thu, công nợ, chỉ số điện nước và sự cố nhà trọ.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}
