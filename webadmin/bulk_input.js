  if (target.classList.contains('bulk-input')) {
    const idx = target.dataset.index;
    const field = target.dataset.field;
    if (state.bulkPreviewData && state.bulkPreviewData[idx]) {
      state.bulkPreviewData[idx][field] = Number(target.value);
      const item = state.bulkPreviewData[idx];
      const electricityAmount = Math.max(0, (item.electricityNew || 0) - item.electricityOld) * item.electricityPrice;
      const waterAmount = Math.max(0, (item.waterNew || 0) - item.waterOld) * item.waterPrice;
      const total = item.roomAmount + item.services + electricityAmount + waterAmount;
      const totalEl = document.getElementById(`bulk-total-${idx}`);
      if (totalEl) totalEl.innerText = money(total);
    }
  }
