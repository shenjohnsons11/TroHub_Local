    if (action === "nav-invoice-bulk") {
      try {
        const previewData = await api.invoices.getBulkPreview();
        state.bulkPreviewData = previewData;
        setState({ adminPage: "invoice_bulk" });
      } catch (e) {
        alert(e.message);
      }
      return;
    }
    
    if (action === "submit-bulk-invoices") {
      try {
        const data = state.bulkPreviewData;
        if (!data || data.length === 0) return alert("Không có dữ liệu hóa đơn!");
        
        let hasError = false;
        const submitData = data.map(item => {
          if (!item.electricityNew && item.electricityNew !== 0) hasError = true;
          if (!item.waterNew && item.waterNew !== 0) hasError = true;
          if (item.electricityNew < item.electricityOld) hasError = true;
          if (item.waterNew < item.waterOld) hasError = true;
          return item;
        });

        if (hasError) {
          return alert("Vui lòng điền đầy đủ và chính xác chỉ số MỚI (phải lớn hơn hoặc bằng chỉ số CŨ) cho tất cả các phòng.");
        }

        if (!confirm(`Phát hành ${submitData.length} hóa đơn cùng lúc?`)) return;

        const res = await api.invoices.bulkCreate({ invoices: submitData });
        alert(res.message || "Tạo hóa đơn hàng loạt thành công!");
        await loadAllData();
        setState({ adminPage: "invoices" });
      } catch (e) {
        alert(e.message);
      }
      return;
    }
