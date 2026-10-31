import os
from pathlib import Path
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.colors as mcolors

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DOCS_DIR = PROJECT_ROOT / "docs"

# 10 Ground-truth & prediction classes with clean display names
CLASSES = [
    ("both_deposit_violations", "Both Deposit\nViolations"),
    ("deficient_notice", "Deficient\nNotice"),
    ("deposit_delay_interest", "Deposit Delay\nInterest"),
    ("emergency_triage", "Emergency\nTriage"),
    ("excess_deposit", "Excess\nDeposit"),
    ("invalid_channel", "Invalid\nChannel"),
    ("lawful_compliant", "Lawful /\nCompliant"),
    ("lawful_deduction", "Lawful\nDeduction"),
    ("out_of_scope", "Out of\nScope"),
    ("unlawful_deduction", "Unlawful\nDeduction"),
]

n_classes = len(CLASSES)

# Build the exact 10x10 matrix from eval_results.md
matrix = np.zeros((n_classes, n_classes), dtype=int)

# Exact ground-truth vs predictions
matrix[0, 0] = 2  # both_deposit_violations
matrix[1, 1] = 5  # deficient_notice -> deficient_notice
matrix[1, 8] = 1  # deficient_notice -> out_of_scope (TC-RNK-008)
matrix[2, 2] = 1  # deposit_delay_interest
matrix[3, 3] = 5  # emergency_triage
matrix[4, 4] = 4  # excess_deposit
matrix[5, 5] = 2  # invalid_channel
matrix[6, 6] = 6  # lawful_compliant
matrix[7, 7] = 1  # lawful_deduction
matrix[8, 8] = 5  # out_of_scope
matrix[9, 9] = 3  # unlawful_deduction

total_samples = matrix.sum()
correct_samples = np.trace(matrix)
accuracy = correct_samples / total_samples * 100.0


def plot_matrix(matrix, dark_mode=False, normalized=False, output_path=None):
    fig, ax = plt.subplots(figsize=(11.5, 9.5), dpi=300)

    # Clean display labels without linebreaks for tick labels
    clean_labels = [c[1].replace('\n', ' ') for c in CLASSES]

    # Calculate row-normalized matrix if requested
    if normalized:
        row_sums = matrix.sum(axis=1, keepdims=True)
        norm_matrix = np.divide(matrix, row_sums, out=np.zeros_like(matrix, dtype=float), where=row_sums != 0) * 100.0
        display_data = norm_matrix
        vmax = 100.0
        cbar_label = 'Recall / Accuracy Rate (%)'
    else:
        display_data = matrix
        vmax = 6.0
        cbar_label = 'Sample Count'

    # Color configuration
    if dark_mode:
        bg_color = "#0B0F19"
        text_color = "#F9FAFB"
        subtext_color = "#9CA3AF"
        grid_color = "#1F2937"
        zero_text_color = "#64748B"
        err_box_color = "#F87171"
        err_text_color = "#EF4444"
        # Deep royal blue gradient for dark mode
        colors = ["#131D31", "#1E3A8A", "#2563EB", "#3B82F6", "#60A5FA"]
        custom_cmap = mcolors.LinearSegmentedColormap.from_list("dark_blues", colors)
        cmap = custom_cmap
    else:
        bg_color = "#FFFFFF"
        text_color = "#0F172A"
        subtext_color = "#475569"
        grid_color = "#E2E8F0"
        zero_text_color = "#94A3B8"
        err_box_color = "#DC2626"
        err_text_color = "#B91C1C"
        cmap = plt.cm.Blues

    fig.patch.set_facecolor(bg_color)
    ax.set_facecolor(bg_color)

    im = ax.imshow(display_data, interpolation='nearest', cmap=cmap, vmin=0, vmax=vmax)

    # Colorbar styling
    cbar = fig.colorbar(im, ax=ax, fraction=0.045, pad=0.04)
    cbar.ax.tick_params(labelsize=10, colors=text_color)
    cbar.outline.set_edgecolor(grid_color)
    cbar.set_label(cbar_label, rotation=270, labelpad=15, color=text_color, fontsize=11, fontweight='bold')

    # Tick marks
    ax.set_xticks(np.arange(n_classes))
    ax.set_yticks(np.arange(n_classes))
    ax.set_xticklabels(clean_labels, rotation=38, ha="right", rotation_mode="anchor", 
                       fontsize=9.5, fontweight='bold', color=text_color)
    ax.set_yticklabels(clean_labels, fontsize=9.5, fontweight='bold', color=text_color)

    # Cell grid borders
    ax.set_xticks(np.arange(n_classes + 1) - .5, minor=True)
    ax.set_yticks(np.arange(n_classes + 1) - .5, minor=True)
    ax.grid(which="minor", color=grid_color, linestyle='-', linewidth=1.4)
    ax.tick_params(which="minor", bottom=False, left=False)
    ax.tick_params(which="major", bottom=True, left=True, color=grid_color)

    for spine in ax.spines.values():
        spine.set_edgecolor(grid_color)
        spine.set_linewidth(1.4)

    # Text annotations in each cell
    for i in range(n_classes):
        for j in range(n_classes):
            raw_val = matrix[i, j]
            if raw_val > 0:
                if i == j:
                    # True Positive diagonal
                    if normalized:
                        pct_val = norm_matrix[i, j]
                        txt = f"{pct_val:.0f}%\n({raw_val})"
                        text_c = "#FFFFFF" if pct_val >= 50 else (text_color if not dark_mode else "#FFFFFF")
                    else:
                        txt = f"{raw_val}"
                        # Threshold contrast color
                        if dark_mode:
                            text_c = "#FFFFFF"
                        else:
                            text_c = "#FFFFFF" if raw_val >= 3 else "#0F172A"
                    
                    ax.text(j, i, txt, ha="center", va="center",
                            color=text_c, fontsize=13 if not normalized else 10.5, 
                            fontweight="bold")
                else:
                    # Error cell (TC-RNK-008)
                    rect = plt.Rectangle((j - 0.46, i - 0.46), 0.92, 0.92, fill=True,
                                         facecolor="#FEE2E2" if not dark_mode else "#3E1F24",
                                         edgecolor=err_box_color, linewidth=2.0, linestyle="--")
                    ax.add_patch(rect)
                    
                    if normalized:
                        pct_val = norm_matrix[i, j]
                        err_txt = f"{pct_val:.1f}%\n(1 Err)"
                    else:
                        err_txt = f"{raw_val}\n(Err)"

                    ax.text(j, i, err_txt, ha="center", va="center",
                            color=err_text_color, fontsize=9.5, fontweight="bold")
            else:
                # 0 cell
                ax.text(j, i, "0", ha="center", va="center",
                        color=zero_text_color, fontsize=9.5, alpha=0.7)

    # Labels and Titles
    ax.set_xlabel("Predicted Legal Verdict", fontsize=12.5, fontweight="bold", labelpad=12, color=text_color)
    ax.set_ylabel("Ground-Truth Statutory Category", fontsize=12.5, fontweight="bold", labelpad=12, color=text_color)

    type_suffix = " (Row-Normalized %)" if normalized else ""
    fig.suptitle(f"Namma Tenant Navigator — Confusion Matrix{type_suffix}",
                 fontsize=15.5, fontweight="bold", y=0.98, color=text_color)

    metrics_str = f"Test Set: N = 35 Cases  |  Overall Accuracy: {accuracy:.1f}% (34/35)  |  Macro F1: 0.982  |  Weighted F1: 0.971"
    ax.set_title(metrics_str, fontsize=10.5, pad=12, color=subtext_color)

    footer = (
        "Ground Truth: Karnataka Rent Act 1999, Indian Contract Act 1872 & Model Tenancy Act 2021\n"
        "Single Edge-Case Misclassification: TC-RNK-008 (Deficient Notice fell back to Out-of-Scope due to missing notice period field)"
    )
    plt.figtext(0.5, 0.015, footer, wrap=True, horizontalalignment='center',
                fontsize=8.5, color=subtext_color, style='italic')

    plt.tight_layout(rect=[0.02, 0.05, 0.98, 0.95])

    if output_path:
        plt.savefig(output_path, dpi=300, facecolor=bg_color, bbox_inches='tight')
        print(f"Saved: {output_path}")
    plt.close()


if __name__ == "__main__":
    DOCS_DIR.mkdir(parents=True, exist_ok=True)

    # 1. Standard Presentation Light Theme (Default for PPT)
    plot_matrix(matrix, dark_mode=False, normalized=False,
                output_path=DOCS_DIR / "confusion_matrix_presentation.png")

    # 2. Presentation Light Theme Normalized (%)
    plot_matrix(matrix, dark_mode=False, normalized=True,
                output_path=DOCS_DIR / "confusion_matrix_normalized.png")

    # 3. Modern Dark Theme (for Dark PPT pitch decks)
    plot_matrix(matrix, dark_mode=True, normalized=False,
                output_path=DOCS_DIR / "confusion_matrix_dark.png")

    # 4. Standard confusion_matrix.png alias
    plot_matrix(matrix, dark_mode=False, normalized=False,
                output_path=DOCS_DIR / "confusion_matrix.png")

    print("All PPT confusion matrix variants generated successfully!")
