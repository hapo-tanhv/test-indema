using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using MySql.Data.MySqlClient;
using Newtonsoft.Json;
using TestIndema.Models;

namespace TestIndema.Controllers
{
    public class ApiController : Controller
    {
        // 1. Lấy danh sách máy dập và máy vít (trang Tổng quan)
        [HttpGet]
        public ActionResult GetMachines()
        {
            try
            {
                var dt = DbHelper.ExecuteQuery(@"
                    SELECT m.*, mt.Code as MachineTypeCode, mt.Name as MachineTypeName
                    FROM Machines m
                    JOIN MachineTypes mt ON m.MachineTypeId = mt.Id
                    ORDER BY m.MachineCode");

                var list = new List<object>();

                foreach (DataRow row in dt.Rows)
                {
                    int machineId = Convert.ToInt32(row["Id"]);
                    string machineCode = row["MachineCode"].ToString();
                    string type = row["MachineTypeCode"].ToString() == "STAMPING" ? "stamping" : "screw";
                    bool isMonitored = Convert.ToBoolean(row["IsMonitored"]);

                    var attributes = new Dictionary<string, string>();
                    if (row["AttributesJson"] != DBNull.Value && !string.IsNullOrEmpty(row["AttributesJson"].ToString()))
                    {
                        try
                        {
                            attributes = JsonConvert.DeserializeObject<Dictionary<string, string>>(row["AttributesJson"].ToString());
                        }
                        catch { }
                    }

                    if (!isMonitored)
                    {
                        // Máy chỉ lưu cấu hình, không giám sát đo lường thực tế
                        list.Add(new
                        {
                            id = machineCode,
                            name = row["Name"].ToString(),
                            type = type,
                            isMonitored = false,
                            status = "stopped",
                            sp = "---",
                            order = "---",
                            strokes = "0",
                            dailyTarget = "0",
                            totalOrder = "0",
                            efficiency = "0%",
                            timeEfficiency = "0%",
                            runtime = "00:00:00",
                            stoptime = "00:00:00",
                            runtimeMax = "00:00:00",
                            load = 0,
                            trend = new int[] { 0, 0, 0, 0 },
                            trialTime = "00:00:00",
                            productCode = "",
                            productName = "",
                            plannedQty = "0",
                            shiftHours = 0,
                            activeOrderId = "",
                            ordersHistory = new string[] { },
                            attributes = attributes
                        });
                        continue;
                    }

                    // Tìm ca làm việc hiện hành của máy
                    var shiftDt = DbHelper.ExecuteQuery(@"
                        SELECT * FROM MachineShifts
                        WHERE MachineId = @MachineId AND EffectiveDate <= CURRENT_DATE()
                        ORDER BY EffectiveDate DESC, Id DESC
                        LIMIT 1",
                        new MySqlParameter("@MachineId", machineId));

                    string runtimeMax = "08:00:00";
                    double shiftHours = 8.0;
                    if (shiftDt.Rows.Count > 0)
                    {
                        var shiftRow = shiftDt.Rows[0];
                        var start = (TimeSpan)shiftRow["StartTime"];
                        var end = (TimeSpan)shiftRow["EndTime"];
                        var diff = end - start;
                        if (diff.TotalHours < 0) diff = diff.Add(TimeSpan.FromDays(1));
                        shiftHours = diff.TotalHours;
                        runtimeMax = string.Format("{0:00}:{1:00}:{2:00}", (int)diff.TotalHours, diff.Minutes, diff.Seconds);
                    }

                    // Tìm Lệnh sản xuất đang chạy (hoặc lệnh mới nhất được phân bổ)
                    var orderDt = DbHelper.ExecuteQuery(@"
                        SELECT mo.*, po.OrderNo, po.ProductCode, po.ProductName, po.TotalQuantity
                        FROM MachineOrders mo
                        JOIN ProductionOrders po ON mo.OrderId = po.Id
                        WHERE mo.MachineId = @MachineId AND po.Status = 'running'
                        ORDER BY mo.AssignedAt DESC
                        LIMIT 1",
                        new MySqlParameter("@MachineId", machineId));

                    // Nếu không có lệnh nào đang running, tìm lệnh gần nhất
                    if (orderDt.Rows.Count == 0)
                    {
                        orderDt = DbHelper.ExecuteQuery(@"
                            SELECT mo.*, po.OrderNo, po.ProductCode, po.ProductName, po.TotalQuantity
                            FROM MachineOrders mo
                            JOIN ProductionOrders po ON mo.OrderId = po.Id
                            WHERE mo.MachineId = @MachineId
                            ORDER BY mo.AssignedAt DESC
                            LIMIT 1",
                            new MySqlParameter("@MachineId", machineId));
                    }

                    string orderNo = "---";
                    string productCode = "";
                    string productName = "---";
                    string strokesStr = "0";
                    string totalOrderStr = "0";
                    string plannedQtyStr = "0";
                    string activeOrderId = "";
                    int orderId = 0;

                    if (orderDt.Rows.Count > 0)
                    {
                        var orderRow = orderDt.Rows[0];
                        orderId = Convert.ToInt32(orderRow["OrderId"]);
                        orderNo = orderRow["OrderNo"].ToString();
                        activeOrderId = orderNo;
                        productCode = orderRow["ProductCode"].ToString();
                        productName = orderRow["ProductName"].ToString();
                        totalOrderStr = string.Format("{0:#,##0}", orderRow["TotalQuantity"]).Replace(',', '.');
                        plannedQtyStr = string.Format("{0:#,##0}", orderRow["TargetQuantity"]).Replace(',', '.');
                    }

                    // Lấy tổng sản lượng thực tế, thời gian chạy thực tế từ Logs trong ngày hôm nay
                    var logDt = DbHelper.ExecuteQuery(@"
                        SELECT 
                            SUM(ActualStrokes) as TotalStrokes,
                            SUM(RunningSeconds) as TotalRunningSeconds,
                            SUM(SetupSeconds) as TotalSetupSeconds
                        FROM ProductionLogs
                        WHERE MachineId = @MachineId AND DATE(Timestamp) = CURRENT_DATE()",
                        new MySqlParameter("@MachineId", machineId));

                    int strokes = 0;
                    int runningSeconds = 0;
                    int setupSeconds = 0;

                    if (logDt.Rows.Count > 0 && logDt.Rows[0]["TotalStrokes"] != DBNull.Value)
                    {
                        strokes = Convert.ToInt32(logDt.Rows[0]["TotalStrokes"]);
                        runningSeconds = Convert.ToInt32(logDt.Rows[0]["TotalRunningSeconds"]);
                        setupSeconds = Convert.ToInt32(logDt.Rows[0]["TotalSetupSeconds"]);
                    }

                    strokesStr = string.Format("{0:#,##0}", strokes).Replace(',', '.');

                    // Giả lập OEE và thời gian dừng máy
                    double runningHours = runningSeconds / 3600.0;
                    double setupHours = setupSeconds / 3600.0;
                    double stopHours = Math.Max(0, shiftHours - runningHours - setupHours);

                    string runtimeStr = string.Format("{0:00}:{1:00}:{2:00}", (int)runningHours, (int)((runningSeconds % 3600) / 60), runningSeconds % 60);
                    string trialTimeStr = string.Format("{0:00}:{1:00}:{2:00}", (int)setupHours, (int)((setupSeconds % 3600) / 60), setupSeconds % 60);
                    string stoptimeStr = string.Format("{0:00}:{1:00}:{2:00}", (int)stopHours, (int)((stopHours * 60) % 60), (int)((stopHours * 3600) % 60));

                    // Tính OEE %
                    double efficiencyVal = 0.0;
                    if (shiftHours > 0)
                    {
                        efficiencyVal = (runningHours / shiftHours) * 100.0;
                    }
                    if (efficiencyVal > 100) efficiencyVal = 100.0;

                    double timeEfficiencyVal = efficiencyVal * 0.9; // Giả lập tỷ lệ thời gian khả dụng

                    string efficiency = string.Format("{0:0.0}%", efficiencyVal).Replace(',', '.');
                    string timeEfficiency = string.Format("{0:0.0}%", timeEfficiencyVal).Replace(',', '.');

                    // Lấy xu hướng sản lượng trong 4 giờ gần nhất của ngày hôm nay
                    var trend = new int[] { 0, 0, 0, 0 };
                    var trendDt = DbHelper.ExecuteQuery(@"
                        SELECT HourVal, SUM(ActualStrokes) as HourStrokes
                        FROM (
                            SELECT HOUR(Timestamp) as HourVal, ActualStrokes
                            FROM ProductionLogs
                            WHERE MachineId = @MachineId AND DATE(Timestamp) = CURRENT_DATE()
                        ) t
                        GROUP BY HourVal
                        ORDER BY HourVal DESC
                        LIMIT 4",
                        new MySqlParameter("@MachineId", machineId));

                    for (int i = 0; i < trendDt.Rows.Count && i < 4; i++)
                    {
                        trend[3 - i] = Convert.ToInt32(trendDt.Rows[i]["HourStrokes"]);
                    }

                    // Lịch sử các Lệnh sản xuất máy này đã chạy
                    var historyDt = DbHelper.ExecuteQuery(@"
                        SELECT DISTINCT po.OrderNo
                        FROM MachineOrders mo
                        JOIN ProductionOrders po ON mo.OrderId = po.Id
                        WHERE mo.MachineId = @MachineId
                        ORDER BY mo.AssignedAt DESC",
                        new MySqlParameter("@MachineId", machineId));

                    var ordersHistory = new List<string>();
                    foreach (DataRow hRow in historyDt.Rows)
                    {
                        ordersHistory.Add(hRow["OrderNo"].ToString());
                    }

                    list.Add(new
                    {
                        id = machineCode,
                        name = row["Name"].ToString(),
                        type = type,
                        isMonitored = true,
                        status = row["Status"].ToString(),
                        sp = productName,
                        order = orderNo,
                        strokes = strokesStr,
                        dailyTarget = string.Format("{0:#,##0}", (int)(shiftHours * 150)).Replace(',', '.'), // Giả lập mục tiêu ngày dựa vào ca
                        totalOrder = totalOrderStr,
                        efficiency = efficiency,
                        timeEfficiency = timeEfficiency,
                        runtime = runtimeStr,
                        stoptime = stoptimeStr,
                        runtimeMax = runtimeMax,
                        load = Math.Round(efficiencyVal, 1),
                        trend = trend,
                        trialTime = trialTimeStr,
                        productCode = productCode,
                        productName = productName,
                        plannedQty = plannedQtyStr,
                        shiftHours = (int)shiftHours,
                        activeOrderId = activeOrderId,
                        ordersHistory = ordersHistory.ToArray(),
                        attributes = attributes
                    });
                }

                return Content(JsonConvert.SerializeObject(new { success = true, data = list }), "application/json");
            }
            catch (Exception ex)
            {
                return Content(JsonConvert.SerializeObject(new { success = false, message = ex.Message }), "application/json");
            }
        }

        // 2. Lấy thông số cấu hình thuộc tính của loại máy và chi tiết máy
        [HttpGet]
        public ActionResult GetMachineAttributes(string code)
        {
            try
            {
                var machineDt = DbHelper.ExecuteQuery(@"
                    SELECT m.*, mt.Id as MachineTypeId, mt.Name as MachineTypeName
                    FROM Machines m
                    JOIN MachineTypes mt ON m.MachineTypeId = mt.Id
                    WHERE m.MachineCode = @Code",
                    new MySqlParameter("@Code", code));

                if (machineDt.Rows.Count == 0)
                {
                    return Content(JsonConvert.SerializeObject(new { success = false, message = "Không tìm thấy thiết bị" }), "application/json");
                }

                var machineRow = machineDt.Rows[0];
                int machineTypeId = Convert.ToInt32(machineRow["MachineTypeId"]);

                // Lấy từ điển thuộc tính động cấu hình của loại máy đó
                var attrDt = DbHelper.ExecuteQuery(@"
                    SELECT * FROM MachineTypeAttributes
                    WHERE MachineTypeId = @TypeId
                    ORDER BY DisplayOrder",
                    new MySqlParameter("@TypeId", machineTypeId));

                var metadata = new List<object>();
                foreach (DataRow row in attrDt.Rows)
                {
                    metadata.Add(new
                    {
                        key = row["AttributeKey"].ToString(),
                        displayName = row["DisplayName"].ToString(),
                        unit = row["Unit"] == DBNull.Value ? "" : row["Unit"].ToString(),
                        inputType = row["InputType"].ToString()
                    });
                }

                var values = new Dictionary<string, string>();
                if (machineRow["AttributesJson"] != DBNull.Value && !string.IsNullOrEmpty(machineRow["AttributesJson"].ToString()))
                {
                    try
                    {
                        values = JsonConvert.DeserializeObject<Dictionary<string, string>>(machineRow["AttributesJson"].ToString());
                    }
                    catch { }
                }

                return Content(JsonConvert.SerializeObject(new
                {
                    success = true,
                    isMonitored = Convert.ToBoolean(machineRow["IsMonitored"]),
                    ipAddress = machineRow["IpAddress"] == DBNull.Value ? "" : machineRow["IpAddress"].ToString(),
                    port = machineRow["Port"] == DBNull.Value ? (int?)null : Convert.ToInt32(machineRow["Port"]),
                    metadata = metadata,
                    values = values
                }), "application/json");
            }
            catch (Exception ex)
            {
                return Content(JsonConvert.SerializeObject(new { success = false, message = ex.Message }), "application/json");
            }
        }

        // 3. Lấy danh sách Lệnh sản xuất
        [HttpGet]
        public ActionResult GetProductionOrders()
        {
            try
            {
                var dt = DbHelper.ExecuteQuery("SELECT * FROM ProductionOrders ORDER BY CreatedDate DESC");
                var list = new List<object>();

                foreach (DataRow row in dt.Rows)
                {
                    list.Add(new
                    {
                        id = Convert.ToInt32(row["Id"]),
                        orderNo = row["OrderNo"].ToString(),
                        productCode = row["ProductCode"].ToString(),
                        productName = row["ProductName"].ToString(),
                        totalQuantity = Convert.ToInt32(row["TotalQuantity"]),
                        unit = row["Unit"].ToString(),
                        status = row["Status"].ToString(),
                        createdDate = Convert.ToDateTime(row["CreatedDate"]).ToString("dd/MM/yyyy HH:mm:ss")
                    });
                }

                return Content(JsonConvert.SerializeObject(new { success = true, data = list }), "application/json");
            }
            catch (Exception ex)
            {
                return Content(JsonConvert.SerializeObject(new { success = false, message = ex.Message }), "application/json");
            }
        }

        // 4. Lấy lịch sử hoạt động & Lọc theo loại máy
        [HttpGet]
        public ActionResult GetHistory(string machineType, string machineId, string startDate, string endDate)
        {
            try
            {
                var query = @"
                    SELECT pl.*, m.MachineCode, m.Name as MachineName, mt.Code as MachineTypeCode, po.OrderNo, po.ProductCode, po.ProductName
                    FROM ProductionLogs pl
                    JOIN Machines m ON pl.MachineId = m.Id
                    JOIN MachineTypes mt ON m.MachineTypeId = mt.Id
                    LEFT JOIN ProductionOrders po ON pl.OrderId = po.Id
                    WHERE 1=1";

                var parameters = new List<MySqlParameter>();

                if (!string.IsNullOrEmpty(machineType) && machineType != "all")
                {
                    query += " AND mt.Code = @MachineType";
                    parameters.Add(new MySqlParameter("@MachineType", machineType == "stamping" ? "STAMPING" : (machineType == "screw" ? "SCREW_HEADING" : machineType)));
                }

                if (!string.IsNullOrEmpty(machineId) && machineId != "all")
                {
                    query += " AND m.MachineCode = @MachineCode";
                    parameters.Add(new MySqlParameter("@MachineCode", machineId));
                }

                if (!string.IsNullOrEmpty(startDate))
                {
                    query += " AND pl.Timestamp >= @StartDate";
                    parameters.Add(new MySqlParameter("@StartDate", Convert.ToDateTime(startDate)));
                }

                if (!string.IsNullOrEmpty(endDate))
                {
                    query += " AND pl.Timestamp <= @EndDate";
                    parameters.Add(new MySqlParameter("@EndDate", Convert.ToDateTime(endDate).AddDays(1).AddSeconds(-1)));
                }

                query += " ORDER BY pl.Timestamp DESC LIMIT 200";

                var dt = DbHelper.ExecuteQuery(query, parameters.ToArray());
                var list = new List<object>();

                foreach (DataRow row in dt.Rows)
                {
                    double runningHours = Convert.ToInt32(row["RunningSeconds"]) / 3600.0;
                    double setupHours = Convert.ToInt32(row["SetupSeconds"]) / 3600.0;

                    list.Add(new
                    {
                        id = Convert.ToInt64(row["Id"]),
                        machineCode = row["MachineCode"].ToString(),
                        machineName = row["MachineName"].ToString(),
                        deviceType = row["MachineTypeCode"].ToString() == "STAMPING" ? "MÁY DẬP" : "MÁY VÍT",
                        orderNo = row["OrderNo"] == DBNull.Value ? "---" : row["OrderNo"].ToString(),
                        productCode = row["ProductCode"] == DBNull.Value ? "" : row["ProductCode"].ToString(),
                        productName = row["ProductName"] == DBNull.Value ? "---" : row["ProductName"].ToString(),
                        timestamp = Convert.ToDateTime(row["Timestamp"]).ToString("dd/MM/yyyy HH:mm:ss"),
                        strokes = string.Format("{0:#,##0}", row["ActualStrokes"]).Replace(',', '.'),
                        runtime = string.Format("{0:00}:{1:00}:{2:00}", (int)runningHours, (int)((Convert.ToInt32(row["RunningSeconds"]) % 3600) / 60), Convert.ToInt32(row["RunningSeconds"]) % 60),
                        trialTime = string.Format("{0:00}:{1:00}:{2:00}", (int)setupHours, (int)((Convert.ToInt32(row["SetupSeconds"]) % 3600) / 60), Convert.ToInt32(row["SetupSeconds"]) % 60),
                        status = row["Status"].ToString()
                    });
                }

                return Content(JsonConvert.SerializeObject(new { success = true, data = list }), "application/json");
            }
            catch (Exception ex)
            {
                return Content(JsonConvert.SerializeObject(new { success = false, message = ex.Message }), "application/json");
            }
        }

        // 5. Lấy danh sách Cảnh báo
        [HttpGet]
        public ActionResult GetAlarms(string severity, string status)
        {
            try
            {
                var query = @"
                    SELECT a.*, m.MachineCode, m.Name as MachineName, mt.Code as MachineTypeCode, po.OrderNo
                    FROM Alarms a
                    JOIN Machines m ON a.MachineId = m.Id
                    JOIN MachineTypes mt ON m.MachineTypeId = mt.Id
                    LEFT JOIN ProductionOrders po ON a.OrderId = po.Id
                    WHERE 1=1";

                var parameters = new List<MySqlParameter>();

                if (!string.IsNullOrEmpty(severity) && severity != "all")
                {
                    query += " AND a.Severity = @Severity";
                    parameters.Add(new MySqlParameter("@Severity", severity));
                }

                if (!string.IsNullOrEmpty(status) && status != "all")
                {
                    query += " AND a.Status = @Status";
                    parameters.Add(new MySqlParameter("@Status", status));
                }

                query += " ORDER BY a.Timestamp DESC LIMIT 100";

                var dt = DbHelper.ExecuteQuery(query, parameters.ToArray());
                var list = new List<object>();

                foreach (DataRow row in dt.Rows)
                {
                    list.Add(new
                    {
                        id = Convert.ToInt32(row["Id"]),
                        machineCode = row["MachineCode"].ToString(),
                        machineName = row["MachineName"].ToString(),
                        deviceType = row["MachineTypeCode"].ToString() == "STAMPING" ? "MÁY DẬP" : "MÁY VÍT",
                        orderNo = row["OrderNo"] == DBNull.Value ? "---" : row["OrderNo"].ToString(),
                        code = row["Code"].ToString(),
                        severity = row["Severity"].ToString(),
                        description = row["Description"].ToString(),
                        timestamp = Convert.ToDateTime(row["Timestamp"]).ToString("dd/MM/yyyy HH:mm:ss"),
                        status = row["Status"].ToString(),
                        resolvedAt = row["ResolvedAt"] == DBNull.Value ? "" : Convert.ToDateTime(row["ResolvedAt"]).ToString("dd/MM/yyyy HH:mm:ss")
                    });
                }

                return Content(JsonConvert.SerializeObject(new { success = true, data = list }), "application/json");
            }
            catch (Exception ex)
            {
                return Content(JsonConvert.SerializeObject(new { success = false, message = ex.Message }), "application/json");
            }
        }

        // 6. Lưu cấu hình thiết bị
        [HttpPost]
        public ActionResult SaveMachineConfig(string code, string attributesJson, string ipAddress, int? port, bool isMonitored)
        {
            try
            {
                var rows = DbHelper.ExecuteNonQuery(@"
                    UPDATE Machines
                    SET AttributesJson = @AttributesJson, IpAddress = @Ip, Port = @Port, IsMonitored = @Monitored, UpdatedAt = CURRENT_TIMESTAMP()
                    WHERE MachineCode = @Code",
                    new MySqlParameter("@AttributesJson", attributesJson),
                    new MySqlParameter("@Ip", string.IsNullOrEmpty(ipAddress) ? (object)DBNull.Value : ipAddress),
                    new MySqlParameter("@Port", port.HasValue ? (object)port.Value : DBNull.Value),
                    new MySqlParameter("@Monitored", isMonitored ? 1 : 0),
                    new MySqlParameter("@Code", code));

                if (rows > 0)
                {
                    return Content(JsonConvert.SerializeObject(new { success = true, message = "Lưu cấu hình thiết bị thành công" }), "application/json");
                }
                return Content(JsonConvert.SerializeObject(new { success = false, message = "Không tìm thấy thiết bị" }), "application/json");
            }
            catch (Exception ex)
            {
                return Content(JsonConvert.SerializeObject(new { success = false, message = ex.Message }), "application/json");
            }
        }

        // 7. Lưu cấu hình ca làm việc
        [HttpPost]
        public ActionResult SaveShiftConfig(string code, string shiftType, string startTime, string endTime)
        {
            try
            {
                // Tìm MachineId từ Code
                var machineDt = DbHelper.ExecuteQuery("SELECT Id FROM Machines WHERE MachineCode = @Code", new MySqlParameter("@Code", code));
                if (machineDt.Rows.Count == 0)
                {
                    return Content(JsonConvert.SerializeObject(new { success = false, message = "Không tìm thấy thiết bị" }), "application/json");
                }
                int machineId = Convert.ToInt32(machineDt.Rows[0]["Id"]);

                // Thêm hoặc cập nhật ca làm việc cho ngày hôm nay
                var rows = DbHelper.ExecuteNonQuery(@"
                    INSERT INTO MachineShifts (MachineId, ShiftType, StartTime, EndTime, EffectiveDate)
                    VALUES (@MachineId, @ShiftType, @Start, @End, CURRENT_DATE())
                    ON DUPLICATE KEY UPDATE ShiftType = VALUES(ShiftType), StartTime = VALUES(StartTime), EndTime = VALUES(EndTime)",
                    new MySqlParameter("@MachineId", machineId),
                    new MySqlParameter("@ShiftType", shiftType),
                    new MySqlParameter("@Start", TimeSpan.Parse(startTime)),
                    new MySqlParameter("@End", TimeSpan.Parse(endTime)));

                return Content(JsonConvert.SerializeObject(new { success = true, message = "Cập nhật ca làm việc thành công" }), "application/json");
            }
            catch (Exception ex)
            {
                return Content(JsonConvert.SerializeObject(new { success = false, message = ex.Message }), "application/json");
            }
        }

        // 8. Tạo lệnh sản xuất mới
        [HttpPost]
        public ActionResult CreateProductionOrder(string orderNo, string productCode, string productName, int totalQuantity, string unit, string assignmentsJson)
        {
            try
            {
                // Thêm Lệnh sản xuất mới
                DbHelper.ExecuteNonQuery(@"
                    INSERT INTO ProductionOrders (OrderNo, ProductCode, ProductName, TotalQuantity, Unit, Status, CreatedDate)
                    VALUES (@OrderNo, @ProductCode, @ProductName, @Qty, @Unit, 'running', CURRENT_TIMESTAMP())",
                    new MySqlParameter("@OrderNo", orderNo),
                    new MySqlParameter("@ProductCode", productCode),
                    new MySqlParameter("@ProductName", productName),
                    new MySqlParameter("@Qty", totalQuantity),
                    new MySqlParameter("@Unit", string.IsNullOrEmpty(unit) ? "PCS" : unit));

                // Lấy ID Lệnh sản xuất vừa tạo
                var orderDt = DbHelper.ExecuteQuery("SELECT Id FROM ProductionOrders WHERE OrderNo = @OrderNo", new MySqlParameter("@OrderNo", orderNo));
                int orderId = Convert.ToInt32(orderDt.Rows[0]["Id"]);

                // Phân bổ máy chạy lệnh
                if (!string.IsNullOrEmpty(assignmentsJson))
                {
                    var assignments = JsonConvert.DeserializeObject<List<Dictionary<string, object>>>(assignmentsJson);
                    foreach (var assign in assignments)
                    {
                        string mCode = assign["machineCode"].ToString();
                        int targetQty = Convert.ToInt32(assign["targetQuantity"]);

                        var mDt = DbHelper.ExecuteQuery("SELECT Id FROM Machines WHERE MachineCode = @Code", new MySqlParameter("@Code", mCode));
                        if (mDt.Rows.Count > 0)
                        {
                            int mId = Convert.ToInt32(mDt.Rows[0]["Id"]);
                            DbHelper.ExecuteNonQuery(@"
                                INSERT INTO MachineOrders (MachineId, OrderId, TargetQuantity, ActualQuantity)
                                VALUES (@MachineId, @OrderId, @Target, 0)",
                                new MySqlParameter("@MachineId", mId),
                                new MySqlParameter("@OrderId", orderId),
                                new MySqlParameter("@Target", targetQty));
                        }
                    }
                }

                return Content(JsonConvert.SerializeObject(new { success = true, message = "Tạo lệnh sản xuất và phân bổ máy thành công" }), "application/json");
            }
            catch (Exception ex)
            {
                return Content(JsonConvert.SerializeObject(new { success = false, message = ex.Message }), "application/json");
            }
        }

        // 9. Lấy dữ liệu báo cáo hiệu suất và OEE
        [HttpGet]
        public ActionResult GetReportData(string range, string machineId, string selectedDate)
        {
            try
            {
                // Chuẩn hóa khoảng thời gian
                string normalizedRange = range;
                if (range == "24h") normalizedRange = "day";
                if (range == "7d") normalizedRange = "week";

                // Mặc định các giá trị OEE
                int actualStrokes = 0;
                int targetStrokes = 0;
                int trialMins = 0;
                int runningMins = 0;
                int stoppedMins = 0;

                var tableRows = new List<object>();

                // Lấy danh sách máy dập/vít phù hợp
                string machineFilter = "";
                var parameters = new List<MySqlParameter>();

                if (!string.IsNullOrEmpty(machineId) && machineId != "all")
                {
                    machineFilter = " AND m.MachineCode = @MachineCode";
                    parameters.Add(new MySqlParameter("@MachineCode", machineId));
                }

                var machinesDt = DbHelper.ExecuteQuery(@"
                    SELECT m.Id, m.MachineCode, m.Name, mt.Code as MachineTypeCode
                    FROM Machines m
                    JOIN MachineTypes mt ON m.MachineTypeId = mt.Id
                    WHERE m.IsMonitored = 1" + machineFilter,
                    parameters.ToArray());

                // Tính toán số ngày trong khoảng lọc
                int daysCount = 1;
                if (normalizedRange == "week") daysCount = 7;
                else if (normalizedRange == "month") daysCount = 30;
                else if (normalizedRange == "year") daysCount = 365;

                int machinesCount = machinesDt.Rows.Count;
                if (machinesCount == 0) machinesCount = 1; // Tránh chia cho 0

                // Duyệt qua từng máy để giả lập / lấy dữ liệu ca sáng và ca chiều
                foreach (DataRow mRow in machinesDt.Rows)
                {
                    int mId = Convert.ToInt32(mRow["Id"]);
                    string mCode = mRow["MachineCode"].ToString();
                    string mTypeName = mRow["MachineTypeCode"].ToString() == "STAMPING" ? "Máy dập" : "Máy vít";

                    // Ca Sáng (08:00 - 12:00)
                    int strokesMorning = 760 * daysCount;
                    int targetMorning = 750 * daysCount;
                    int morningOee = (int)((strokesMorning / (double)targetMorning) * 100);
                    
                    // Ca Chiều (14:00 - 18:00)
                    int strokesAfternoon = 710 * daysCount;
                    int targetAfternoon = 750 * daysCount;
                    int afternoonOee = (int)((strokesAfternoon / (double)targetAfternoon) * 100);

                    actualStrokes += (strokesMorning + strokesAfternoon);
                    targetStrokes += (targetMorning + targetAfternoon);

                    tableRows.Add(new
                    {
                        shift = "Ca Sáng (08:00 - 12:00)",
                        machine = mTypeName + " " + mCode,
                        strokes = strokesMorning,
                        uptime = ((240 * daysCount) / 60.0).ToString("0.0") + "h",
                        downtime = (10 * daysCount) + "m",
                        oee = morningOee + "%",
                        status = morningOee >= 95 ? "Hoàn thành" : "Chưa hoàn thành",
                        statusClass = morningOee >= 95 ? "badge-success" : "badge-danger"
                    });

                    tableRows.Add(new
                    {
                        shift = "Ca Chiều (14:00 - 18:00)",
                        machine = mTypeName + " " + mCode,
                        strokes = strokesAfternoon,
                        uptime = ((210 * daysCount) / 60.0).ToString("0.0") + "h",
                        downtime = (30 * daysCount) + "m",
                        oee = afternoonOee + "%",
                        status = afternoonOee >= 95 ? "Hoàn thành" : "Chưa hoàn thành",
                        statusClass = afternoonOee >= 95 ? "badge-success" : "badge-danger"
                    });
                }

                // OEE & Time efficiency
                int oee = targetStrokes > 0 ? (int)((actualStrokes / (double)targetStrokes) * 100) : 0;
                int timeEff = machineId == "all" ? 93 : 90 + (Convert.ToInt32(machineId) * 2) % 7;

                trialMins = 30 * daysCount * machinesCount;
                runningMins = 410 * daysCount * machinesCount;
                stoppedMins = 480 * daysCount * machinesCount - trialMins - runningMins;

                // Chuẩn bị dữ liệu biểu đồ
                var labels = new List<string>();
                var trialData = new List<double>();
                var runningData = new List<double>();
                var stoppedData = new List<double>();
                var actualYieldData = new List<int>();
                var targetYieldData = new List<int>();

                if (normalizedRange == "day")
                {
                    for (int h = 0; h < 24; h++)
                    {
                        labels.Add(h.ToString("00") + ":00");
                        if ((h >= 8 && h < 12) || (h >= 14 && h < 18))
                        {
                            trialData.Add(h == 8 || h == 14 ? 0.15 : 0.0);
                            runningData.Add(h == 8 || h == 14 ? 0.75 : 0.85);
                            stoppedData.Add(h == 8 || h == 14 ? 0.1 : 0.15);
                            actualYieldData.Add(180 * machinesCount);
                            targetYieldData.Add(190 * machinesCount);
                        }
                        else
                        {
                            trialData.Add(0.0);
                            runningData.Add(0.0);
                            stoppedData.Add(0.0);
                            actualYieldData.Add(0);
                            targetYieldData.Add(0);
                        }
                    }
                }
                else if (normalizedRange == "week")
                {
                    labels.AddRange(new string[] { "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "CN" });
                    trialData.AddRange(new double[] { 0.5, 0.5, 0.5, 0.5, 0.5, 0.3, 0.0 });
                    runningData.AddRange(new double[] { 6.8, 6.9, 6.7, 7.1, 6.9, 5.2, 0.0 });
                    stoppedData.AddRange(new double[] { 0.7, 0.6, 0.8, 0.4, 0.6, 1.5, 0.0 });
                    actualYieldData.AddRange(new int[] { 1520, 1490, 1510, 1530, 1480, 760, 0 }.Select(v => v * machinesCount));
                    targetYieldData.AddRange(new int[] { 1500, 1500, 1500, 1500, 1500, 750, 0 }.Select(v => v * machinesCount));
                }
                else if (normalizedRange == "month")
                {
                    for (int d = 1; d <= 30; d++)
                    {
                        labels.Add("Ngày " + d);
                        trialData.Add(0.5);
                        runningData.Add(6.8);
                        stoppedData.Add(0.7);
                        actualYieldData.Add(1500 * machinesCount);
                        targetYieldData.Add(1520 * machinesCount);
                    }
                }
                else
                {
                    labels.AddRange(new string[] { "T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10", "T11", "T12" });
                    for (int m = 1; m <= 12; m++)
                    {
                        trialData.Add(12.0);
                        runningData.Add(170.0);
                        stoppedData.Add(18.0);
                        actualYieldData.Add(38000 * machinesCount);
                        targetYieldData.Add(40000 * machinesCount);
                    }
                }

                return Content(JsonConvert.SerializeObject(new
                {
                    success = true,
                    actualStrokesStr = string.Format("{0:#,##0}", actualStrokes).Replace(',', '.'),
                    targetStrokesStr = string.Format("{0:#,##0}", targetStrokes).Replace(',', '.'),
                    actualPct = oee,
                    targetOrderStr = string.Format("{0:#,##0}", 5000 * daysCount * machinesCount).Replace(',', '.'),
                    progressOrderStr = string.Format("{0:#,##0}", (int)(actualStrokes * 3.3)).Replace(',', '.'),
                    progressPct = Math.Min(100, (int)(((actualStrokes * 3.3) / (5000 * daysCount * machinesCount)) * 100)),
                    oee = oee,
                    timeEff = timeEff,
                    trialTimeStr = string.Format("{0:00}:{1:00}:00", trialMins / 60, trialMins % 60),
                    runTimeStr = string.Format("{0:00}:{1:00}:00", runningMins / 60, runningMins % 60),
                    tableRows = tableRows,
                    labels = labels,
                    trialData = trialData,
                    runningData = runningData,
                    stoppedData = stoppedData,
                    actualYieldData = actualYieldData,
                    targetYieldData = targetYieldData
                }), "application/json");
            }
            catch (Exception ex)
            {
                return Content(JsonConvert.SerializeObject(new { success = false, message = ex.Message }), "application/json");
            }
        }
    }
}
