console.log("Products frontend javascript file");

$(function () {

  // Sahifa yuklanganida forma yashirin bo'lsin
  $(".dish-container").hide();

  // New Car tugmasi — arrow function emas, oddiy function
  $("#process-btn").on("click", function () {
    $(".dish-container").slideDown(500);
    $(this).hide();
  });

  // Cancel tugmasi
  $("#cancel-btn").on("click", function () {
    $(".dish-container").slideUp(300);
    $("#process-btn").show();
  });

  // Status o'zgartirish
  $(".new-product-status").on("change", async function () {
    const id = $(this).attr("id");
    const productStatus = $(this).val();

    try {
      const response = await axios.post(`/admin/product/${id}`, { productStatus });
      if (response.data?.data) {
        console.log("Product status updated:", productStatus);
        $(this).blur();
      } else {
        alert("Product update failed!");
      }
    } catch (err) {
      console.log(err);
      alert("Product update failed!");
    }
  });

});

function validateForm() {
  const productName       = $(".product-name").val().trim();
  const productPrice      = $(".product-price").val().trim();
  const productMileage    = $(".product-mileage").val().trim();
  const productCollection = $(".product-collection").val();
  const productYear       = $(".product-year").val().trim();
  const productDesc       = $(".product-desc").val().trim();

  if (!productName || !productPrice || !productMileage ||
      !productCollection || !productYear || !productDesc) {
    alert("Please insert all details!");
    return false;
  }

  if (Number(productPrice) <= 0) {
    alert("Price must be greater than 0!");
    return false;
  }

  if (Number(productYear) < 1900 || Number(productYear) > new Date().getFullYear()) {
    alert("Please enter a valid car year!");
    return false;
  }

  return true;
}

function previewFileHandler(input, order) {
  const file = input.files[0];
  const validImageType = ["image/jpg", "image/jpeg", "image/png"];

  if (!file) return;

  if (file.size > 5 * 1024 * 1024) {
    alert("Image size must not exceed 5MB!");
    input.value = "";
    return;
  }

  if (!validImageType.includes(file.type)) {
    alert("Please insert only jpeg, jpg and png!");
    input.value = "";
    return;
  }

  const reader = new FileReader();
  reader.onload = function () {
    $(`#image-section-${order}`).attr("src", reader.result);
  };
  reader.readAsDataURL(file);
}