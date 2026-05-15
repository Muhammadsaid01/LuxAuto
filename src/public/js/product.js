console.log("Products frontend javascript file");

$(function () {
    // Car List va Form o'rtasidagi almashinuv
    $("#process-btn").on("click", () => {
        $(".dish-container").slideToggle(500);
        $("#process-btn").css("display", "none");
    });

    $("#cancel-btn").on("click", () => {
        $(".dish-container").slideToggle(100);
        $("#process-btn").css("display", "flex");
    });

    // Statusni o'zgartirish (Axios orqali)
    $(".new-product-status").on("change", async function(e) {
        const id = e.target.id;
        const productStatus = $(`#${id}.new-product-status`).val();
        
        try {
            const response = await axios.post(`/admin/product/${id}`, { productStatus: productStatus });
            const result = response.data;
            if (result.data) {
                console.log("Product updated");
                $('.new-product-status').blur();
            } else {
                alert("Product update failed!");
            }
        } catch (err) {
            console.log(err);
            alert("Product update failed!");
        }
    });
});

// Funksiyalarni $(function) dan tashqariga chiqaramiz, shunda HTML ularni taniy oladi
function validateForm() {
    const productName = $(".product-name").val();
    const productPrice = $(".product-price").val();
    const productMileage = $(".product-left-count").val();
    const productCollection = $(".product-collection").val();
		const productYear = $(".product-year").val();
    const productDesc = $(".product-desc").val();


    if (productName === "" || productPrice === "" || productMileage === "" || productCollection === "" || productDesc === "" || productYear === "") {
        alert("Please insert all details!");
        return false;
    } 
    return true;
}

function previewFileHandler(input, order) {
    const file = input.files[0];
    const validImageType = ["image/jpg", "image/jpeg", "image/png"];
    
    if (!file) return;

    if (!validImageType.includes(file.type)) {
        alert("Please insert only jpeg, jpg and png!");
    } else {
        const reader = new FileReader();
        reader.onload = function() {
            $(`#image-section-${order}`).attr("src", reader.result);
        };
        reader.readAsDataURL(file);
    }
}